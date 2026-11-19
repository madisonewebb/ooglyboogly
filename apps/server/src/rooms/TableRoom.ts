import { randomInt } from 'node:crypto';
import { type Client, Room, ServerError } from '@colyseus/core';
import {
  BOXES,
  createGame,
  type GameSetup,
  type GameState,
  MAX_CARDS,
  MAX_PLAYERS,
  MIN_CARDS,
  type Move,
  ROLLS_PER_TURN,
  tryMove,
} from '@rollhouse/rules';
import {
  assignFlavor,
  DEFAULT_SETTINGS,
  type ErrorCode,
  type FlavorId,
  isFlavor,
  type ErrorMessage,
  type JoinOptions,
  type Lobby,
  type LobbySettings,
  type MoveMessage,
  MSG_ERROR,
  MSG_FLAVOR,
  MSG_HOLD,
  MSG_LOBBY,
  MSG_MOVE,
  MSG_ROLL,
  MSG_SCORE,
  MSG_SETTINGS,
  MSG_SNAPSHOT,
  MSG_START,
  MSG_UNDO,
  type SessionUser,
  type Snapshot,
} from '@rollhouse/shared';
import { rollDice } from '../dice';
import { verifySession } from '../session';

export interface TableConfig {
  sessionSecret: string;
  version: string;
  /** How long an empty table waits for someone to come back before it closes. */
  emptyTimeoutMs: number;
  /** Seconds a dropped connection may resume with its old session. */
  reconnectSeconds: number;
}

export const EMPTY_TIMEOUT_MS = 15 * 60 * 1000;
export const RECONNECT_SECONDS = 30;

/** A user at the table: a seat, or a spectator. One user may have several devices connected. */
interface Member {
  user: SessionUser;
  sessions: Set<string>;
  /** Seats only; spectators keep the first free one, unused. */
  flavor: FlavorId;
}

const isObject = (m: unknown): m is Record<string, unknown> =>
  typeof m === 'object' && m !== null && !Array.isArray(m);

/** Unbiased shuffle with the same secure source as the dice. */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Applies a settings intent, or returns null if any field is invalid. */
export function mergeSettings(current: LobbySettings, intent: unknown): LobbySettings | null {
  if (!isObject(intent)) return null;
  const next = { ...current };
  for (const [key, value] of Object.entries(intent)) {
    switch (key) {
      case 'cardsPerPlayer':
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < MIN_CARDS ||
          value > MAX_CARDS
        ) {
          return null;
        }
        next.cardsPerPlayer = value;
        break;
      case 'playStyle':
        if (value !== 'turns' && value !== 'together') return null;
        next.playStyle = value;
        break;
      case 'multipliers':
        if (typeof value !== 'boolean') return null;
        next.multipliers = value;
        break;
      case 'turnOrder':
        if (value !== 'fixed' && value !== 'random') return null;
        next.turnOrder = value;
        break;
      default:
        return null;
    }
  }
  return next;
}

/**
 * Builds the room class for one server. Config arrives through the closure
 * rather than room options, so nothing a client sends can override it.
 *
 * The room keeps the game as setup + move log (the rules engine replays it).
 * There is no schema state: clients get a snapshot on join and then each
 * accepted move, and rebuild the game themselves with the same engine.
 */
export function createTableRoom(cfg: TableConfig) {
  return class TableRoom extends Room {
    override maxClients = 32;
    override autoDispose = false;

    seats: Member[] = [];
    spectators: Member[] = [];
    hostId = '';
    settings: LobbySettings = { ...DEFAULT_SETTINGS };
    setup: GameSetup | null = null;
    game: GameState | null = null;
    moves: Move[] = [];
    private emptyTimer: { clear(): void } | null = null;

    override onCreate(options: Partial<JoinOptions>) {
      const id = options?.instanceId;
      if (typeof id !== 'string' || id.length === 0 || id.length > 128) {
        throw new ServerError(400, 'missing instanceId');
      }
      this.armEmptyTimer();
    }

    override onAuth(_client: Client, options: Partial<JoinOptions>): SessionUser {
      const user = verifySession(options?.session, cfg.sessionSecret);
      if (!user) throw new ServerError(401, 'sign in again');
      return user;
    }

    override onJoin(client: Client, options?: Partial<JoinOptions>) {
      const user = client.auth as SessionUser;
      this.emptyTimer?.clear();
      this.emptyTimer = null;

      let member = this.seats.find((s) => s.user.id === user.id);
      if (!member) {
        if (!this.setup && this.seats.length < MAX_PLAYERS) {
          const flavor = assignFlavor(
            this.seats.map((s) => s.flavor),
            isFlavor(options?.flavor) ? options.flavor : null,
            isFlavor(options?.backup) ? options.backup : null,
          );
          member = { user, sessions: new Set(), flavor };
          this.seats.push(member);
          if (!this.hostId) this.hostId = user.id;
        } else {
          member = this.spectators.find((s) => s.user.id === user.id);
          if (!member) {
            member = { user, sessions: new Set(), flavor: assignFlavor([]) };
            this.spectators.push(member);
          }
        }
      }
      // A rejoin may bring a fresh name or avatar.
      member.user = user;
      member.sessions.add(client.sessionId);
      this.sendSnapshot(client);
      this.broadcastLobby(client);
    }

    override onDrop(client: Client) {
      this.memberOf(client)?.sessions.delete(client.sessionId);
      this.broadcastLobby();
      // Rejects if the time runs out (onLeave follows) or the room is closing.
      this.allowReconnection(client, cfg.reconnectSeconds).catch(() => {});
    }

    /** Same as a join: the snapshot covers any moves made while it was away. */
    override onReconnect(client: Client) {
      this.onJoin(client);
    }

    override onLeave(client: Client) {
      const userId = (client.auth as SessionUser).id;
      for (const list of [this.seats, this.spectators]) {
        const m = list.find((s) => s.user.id === userId);
        m?.sessions.delete(client.sessionId);
      }
      // Before the start an empty seat is freed; after it, the seat waits for its player.
      if (!this.setup) {
        this.seats = this.seats.filter((s) => s.sessions.size > 0);
        if (!this.seats.some((s) => s.user.id === this.hostId)) {
          this.hostId = this.seats[0]?.user.id ?? '';
        }
      }
      this.spectators = this.spectators.filter((s) => s.sessions.size > 0);
      this.broadcastLobby();
      if (this.connectedCount() === 0) this.armEmptyTimer();
    }

    override messages = {
      [MSG_SETTINGS]: (client: Client, intent: unknown) => {
        if (!this.checkHost(client)) return;
        const next = mergeSettings(this.settings, intent);
        if (!next) return this.sendError(client, 'BAD_INTENT', 'those settings are not valid');
        this.settings = next;
        this.broadcastLobby();
      },

      [MSG_FLAVOR]: (client: Client, intent: unknown) => {
        if (this.setup) return this.sendError(client, 'STARTED', 'the game has started');
        const userId = (client.auth as SessionUser).id;
        const member = this.seats.find((s) => s.user.id === userId);
        if (!member) return this.sendError(client, 'NOT_SEATED', 'you are watching this game');
        if (!isObject(intent) || !isFlavor(intent['flavor']) || !isFlavor(intent['backup'])) {
          return this.sendError(client, 'BAD_INTENT', 'pick one of the flavors');
        }
        const taken = this.seats.filter((s) => s !== member).map((s) => s.flavor);
        member.flavor = assignFlavor(taken, intent['flavor'], intent['backup']);
        this.broadcastLobby();
      },

      [MSG_START]: (client: Client) => {
        if (!this.checkHost(client)) return;
        const seats = this.seats.map((_, i) => i);
        const setup: GameSetup = {
          players: this.seats.length,
          cardsPerPlayer: this.settings.cardsPerPlayer,
          playStyle: this.settings.playStyle,
          multipliers: this.settings.multipliers,
          turnOrder: this.settings.turnOrder === 'random' ? shuffle(seats) : seats,
        };
        this.game = createGame(setup);
        this.setup = setup;
        for (const c of this.clients) this.sendSnapshot(c);
      },

      [MSG_ROLL]: (client: Client) => {
        const seat = this.seatOf(client);
        if (seat === null) return;
        const turn = this.game!.players[seat]!.turn;
        const free = turn.held.filter((h) => !h).length;
        // Out-of-turn or spent rolls get [] and the rules engine names the problem.
        const values = free > 0 && turn.rolls < ROLLS_PER_TURN ? rollDice(free) : [];
        this.apply(client, { type: 'roll', player: seat, values });
      },

      [MSG_HOLD]: (client: Client, intent: unknown) => {
        const seat = this.seatOf(client);
        if (seat === null) return;
        if (!isObject(intent)) return this.sendError(client, 'BAD_INTENT', 'which die?');
        this.apply(client, {
          type: 'hold',
          player: seat,
          die: intent['die'] as number,
          held: intent['held'] as boolean,
        });
      },

      [MSG_SCORE]: (client: Client, intent: unknown) => {
        const seat = this.seatOf(client);
        if (seat === null) return;
        if (!isObject(intent) || !(BOXES as readonly unknown[]).includes(intent['box'])) {
          return this.sendError(client, 'BAD_INTENT', 'which box?');
        }
        this.apply(client, {
          type: 'score',
          player: seat,
          card: intent['card'] as number,
          box: intent['box'] as (typeof BOXES)[number],
        });
      },

      [MSG_UNDO]: (client: Client) => {
        const seat = this.seatOf(client);
        if (seat === null) return;
        this.apply(client, { type: 'undo', player: seat });
      },
    };

    /* ---------- helpers ---------- */

    lobby(): Lobby {
      return {
        seats: this.seats.map((s) => ({
          user: s.user,
          connected: s.sessions.size > 0,
          flavor: s.flavor,
        })),
        hostId: this.hostId,
        settings: this.settings,
        started: this.setup !== null,
        spectators: this.spectators.map((s) => s.user),
      };
    }

    private sendSnapshot(client: Client) {
      const body: Snapshot = {
        lobby: this.lobby(),
        setup: this.setup,
        moves: this.moves,
        version: cfg.version,
        you: client.auth as SessionUser,
      };
      client.send(MSG_SNAPSHOT, body);
    }

    private broadcastLobby(except?: Client) {
      this.broadcast(MSG_LOBBY, this.lobby(), except ? { except } : {});
    }

    private sendError(client: Client, code: ErrorCode, message: string) {
      client.send(MSG_ERROR, { code, message } satisfies ErrorMessage);
    }

    private memberOf(client: Client): Member | undefined {
      return [...this.seats, ...this.spectators].find((m) => m.sessions.has(client.sessionId));
    }

    private connectedCount(): number {
      return [...this.seats, ...this.spectators].reduce((n, m) => n + m.sessions.size, 0);
    }

    private checkHost(client: Client): boolean {
      if ((client.auth as SessionUser).id !== this.hostId) {
        this.sendError(client, 'NOT_HOST', 'only the host can do that');
        return false;
      }
      if (this.setup) {
        this.sendError(client, 'STARTED', 'the game has started');
        return false;
      }
      return true;
    }

    /** The sender's seat in a started game, or null after telling them why not. */
    private seatOf(client: Client): number | null {
      if (!this.game) {
        this.sendError(client, 'NOT_STARTED', 'the game has not started');
        return null;
      }
      const userId = (client.auth as SessionUser).id;
      const seat = this.seats.findIndex((s) => s.user.id === userId);
      if (seat < 0) {
        this.sendError(client, 'NOT_SEATED', 'you are watching this game');
        return null;
      }
      return seat;
    }

    private apply(client: Client, move: Move) {
      const result = tryMove(this.game!, move);
      if (!result.ok) return this.sendError(client, result.error.code, result.error.message);
      this.game = result.state;
      this.moves.push(move);
      const message: MoveMessage = { index: this.moves.length - 1, move };
      // Which recorded tumble to play. Drawn after the dice, and only for looks.
      if (move.type === 'roll') message.tumble = randomInt(0, 2 ** 30);
      this.broadcast(MSG_MOVE, message);
    }

    private armEmptyTimer() {
      this.emptyTimer?.clear();
      this.emptyTimer = this.clock.setTimeout(() => this.disconnect(), cfg.emptyTimeoutMs);
    }
  };
}
