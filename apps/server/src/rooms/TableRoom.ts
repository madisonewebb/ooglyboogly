import { randomInt, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { type Client, Room, ServerError } from '@colyseus/core';
import {
  BOXES,
  computePayouts,
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
  assignTint,
  DEFAULT_SETTINGS,
  type ErrorCode,
  isGuestId,
  type TintId,
  isTint,
  type ErrorMessage,
  type JoinOptions,
  type Lobby,
  type LobbySettings,
  type MoveMessage,
  type PayoutMessage,
  MSG_ERROR,
  MSG_TINT,
  MSG_HOLD,
  MSG_LOBBY,
  MSG_MOVE,
  MSG_PAYOUT,
  MSG_ROLL,
  MSG_SCORE,
  MSG_SETTINGS,
  MSG_SNAPSHOT,
  MSG_START,
  MSG_UNDO,
  MSG_REACT,
  MSG_REACTION,
  isSticker,
  REACTION_COOLDOWN_MS,
  type ReactionMessage,
  type SessionUser,
  type Snapshot,
} from '@rollhouse/shared';
import { getBalance, type PayoutRow, payOut } from '../db';
import { rollDice } from '../dice';
import { verifySession } from '../session';

export interface TableConfig {
  sessionSecret: string;
  version: string;
  /** How long an empty table waits for someone to come back before it closes. */
  emptyTimeoutMs: number;
  /** Seconds a dropped connection may resume with its old session. */
  reconnectSeconds: number;
  /** Where coins are recorded. Null pays nothing (tests that do not care). */
  db: DatabaseSync | null;
  /** Guests earn coins too. Only for local dev and e2e, where guest login is on. */
  guestPayouts: boolean;
}

export const EMPTY_TIMEOUT_MS = 15 * 60 * 1000;
export const RECONNECT_SECONDS = 30;

/** A user at the table: a seat, or a spectator. One user may have several devices connected. */
interface Member {
  user: SessionUser;
  sessions: Set<string>;
  /** Seats only; spectators keep the first free one, unused. */
  tint: TintId;
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
    /** Names this game in the payouts table. Made when the host starts it. */
    gameId = '';
    /** Set once the game's payout has been tried, so it is never tried twice. */
    private paid = false;
    /** What was paid, once it has been: sent to everyone, and to anyone who joins later. */
    private settled: PayoutMessage['seats'] | null = null;
    /** Each paid player's balance right after the payout, so joining never needs the database. */
    private balances = new Map<string, number>();
    private emptyTimer: { clear(): void } | null = null;
    /** When each user last sent a sticker, for the cooldown. */
    private lastReaction = new Map<string, number>();
    private reactions = 0;

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
          const tint = assignTint(
            this.seats.map((s) => s.tint),
            isTint(options?.tint) ? options.tint : null,
          );
          member = { user, sessions: new Set(), tint };
          this.seats.push(member);
          if (!this.hostId) this.hostId = user.id;
        } else {
          member = this.spectators.find((s) => s.user.id === user.id);
          if (!member) {
            member = { user, sessions: new Set(), tint: assignTint([]) };
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

      [MSG_TINT]: (client: Client, intent: unknown) => {
        if (this.setup) return this.sendError(client, 'STARTED', 'the game has started');
        const userId = (client.auth as SessionUser).id;
        const member = this.seats.find((s) => s.user.id === userId);
        if (!member) return this.sendError(client, 'NOT_SEATED', 'you are watching this game');
        if (!isObject(intent) || !isTint(intent['tint'])) {
          return this.sendError(client, 'BAD_INTENT', 'pick one of the tints');
        }
        const tint = intent['tint'];
        // The picker greys out other players' tints, so a taken one only arrives on a
        // race; keep the current tint and resend the lobby so the client catches up.
        if (!this.seats.some((s) => s !== member && s.tint === tint)) member.tint = tint;
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
        this.gameId = randomUUID();
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

      // Anyone at the table, seated or watching, can send a sticker.
      [MSG_REACT]: (client: Client, intent: unknown) => {
        const member = this.memberOf(client);
        if (!member) return;
        if (!isObject(intent) || !isSticker(intent['sticker'])) {
          return this.sendError(client, 'BAD_INTENT', 'pick one of the stickers');
        }
        const now = Date.now();
        const userId = member.user.id;
        if (now - (this.lastReaction.get(userId) ?? -Infinity) < REACTION_COOLDOWN_MS) return;
        this.lastReaction.set(userId, now);
        const body: ReactionMessage = { id: ++this.reactions, userId, sticker: intent['sticker'] };
        this.broadcast(MSG_REACTION, body);
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
          tint: s.tint,
        })),
        hostId: this.hostId,
        settings: this.settings,
        started: this.setup !== null,
        spectators: this.spectators.map((s) => s.user),
      };
    }

    /** The payout as one client sees it: everyone's earnings, and their own balance. */
    private payoutFor(client: Client): PayoutMessage {
      const { id } = client.auth as SessionUser;
      return { seats: this.settled!, balance: this.balances.get(id) ?? null };
    }

    private sendSnapshot(client: Client) {
      const body: Snapshot = {
        lobby: this.lobby(),
        setup: this.setup,
        moves: this.moves,
        version: cfg.version,
        you: client.auth as SessionUser,
        ...(this.settled ? { payout: this.payoutFor(client) } : {}),
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
      if (this.game.finished) this.settlePayout();
    }

    /**
     * Pays the finished game's coins. The server alone does this, from its own
     * copy of the game: no client message can start or change a payout. It
     * runs once, and if recording fails the game still ends normally with no
     * coins rather than taking the table down with it.
     */
    private settlePayout() {
      if (this.paid || !cfg.db) return;
      this.paid = true;
      try {
        const rows: PayoutRow[] = computePayouts(this.game!).flatMap((p) => {
          const { user } = this.seats[p.player]!;
          if (isGuestId(user.id) && !cfg.guestPayouts) return [];
          return [{ userId: user.id, coins: p.total, breakdown: p.breakdown }];
        });
        if (rows.length > 0 && payOut(cfg.db, this.gameId, rows)) {
          this.settled = rows.map((r) => ({ userId: r.userId, coins: r.coins, ...r.breakdown }));
          for (const r of rows) this.balances.set(r.userId, getBalance(cfg.db, r.userId));
          for (const client of this.clients) client.send(MSG_PAYOUT, this.payoutFor(client));
        }
      } catch (err) {
        console.error(`payout failed for game ${this.gameId}`, err);
      }
    }

    private armEmptyTimer() {
      this.emptyTimer?.clear();
      this.emptyTimer = this.clock.setTimeout(() => this.disconnect(), cfg.emptyTimeoutMs);
    }
  };
}
