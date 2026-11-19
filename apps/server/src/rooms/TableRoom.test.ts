import { afterEach, describe, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { cardOptions, type GameState, type Move, replay, type RollMove } from '@rollhouse/rules';
import {
  DEFAULT_SETTINGS,
  type ErrorMessage,
  type Lobby,
  type MoveMessage,
  MSG_ERROR,
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
  TABLE_ROOM,
} from '@rollhouse/shared';
import { signSession } from '../session';
import { startTestServer, TEST_SECRET, type TestServer } from '../test-server';
import { mergeSettings } from './TableRoom';

let t: TestServer | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
});

const until = async (check: () => boolean, what: string, ms = 3000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
};

/** A player's view of the table, kept the way the web client keeps it. */
class Player {
  snapshot: Snapshot | null = null;
  lobby: Lobby | null = null;
  moves: Move[] = [];
  errors: ErrorMessage[] = [];
  constructor(
    readonly user: SessionUser,
    readonly room: Room,
  ) {
    room.onMessage(MSG_SNAPSHOT, (s: Snapshot) => {
      this.snapshot = s;
      this.lobby = s.lobby;
      this.moves = [...s.moves];
    });
    room.onMessage(MSG_LOBBY, (l: Lobby) => (this.lobby = l));
    room.onMessage(MSG_MOVE, (m: MoveMessage) => {
      expect(m.index).toBe(this.moves.length);
      this.moves.push(m.move);
    });
    room.onMessage(MSG_ERROR, (e: ErrorMessage) => this.errors.push(e));
  }

  get game(): GameState {
    return replay(this.snapshot!.setup!, this.moves);
  }

  get seat(): number {
    return this.lobby!.seats.findIndex((s) => s.user.id === this.user.id);
  }

  /** Sends an intent and waits for the next move or error. */
  async act(type: string, body?: unknown): Promise<'move' | ErrorMessage> {
    const moves = this.moves.length;
    const errors = this.errors.length;
    this.room.send(type, body);
    await until(() => this.moves.length > moves || this.errors.length > errors, type);
    return this.errors.length > errors ? this.errors.at(-1)! : 'move';
  }

  async expectError(type: string, body?: unknown): Promise<string> {
    const result = await this.act(type, body);
    if (result === 'move') throw new Error(`${type} was accepted`);
    return result.code;
  }
}

async function join(name: string, instanceId = 'inst-1', id = `u-${name}`): Promise<Player> {
  const user: SessionUser = { id, name, avatar: null };
  const room = await new Client(t!.baseUrl).joinOrCreate(TABLE_ROOM, {
    instanceId,
    session: signSession(user, TEST_SECRET),
  });
  const p = new Player(user, room);
  await until(() => p.snapshot !== null, `${name}'s snapshot`);
  return p;
}

async function startGame(host: Player, others: Player[], settings: object) {
  host.room.send(MSG_SETTINGS, settings);
  await until(
    () => Object.entries(settings).every(([k, v]) => (host.lobby!.settings as never)[k] === v),
    'settings',
  );
  host.room.send(MSG_START);
  for (const p of [host, ...others]) await until(() => p.snapshot!.setup !== null, 'start');
}

/** Plays one turn: roll, then write the dice in the first box the rules allow. */
async function playTurn(p: Player) {
  expect(await p.act(MSG_ROLL)).toBe('move');
  const ps = p.game.players[p.seat]!;
  for (const [card, c] of ps.cards.entries()) {
    const option = cardOptions(c, ps.turn.dice!).options.find(
      (o) => o.allowed && c.boxes[o.box] === undefined,
    );
    if (option) {
      expect(await p.act(MSG_SCORE, { card, box: option.box })).toBe('move');
      return;
    }
  }
  throw new Error('no box to score');
}

describe('table room', () => {
  it('seats players in join order and makes the first the host', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    await until(() => a.lobby!.seats.length === 2, 'second seat');
    expect(a.lobby!.hostId).toBe('u-Madi');
    expect(b.lobby!.seats.map((s) => s.user.name)).toEqual(['Madi', 'Mom']);
    expect(b.snapshot!.you.name).toBe('Mom');
  });

  it('keeps separate tables for separate Activity instances', async () => {
    t = await startTestServer();
    const a = await join('Madi', 'inst-1');
    const b = await join('Mom', 'inst-2');
    expect(a.room.roomId).not.toBe(b.room.roomId);
    expect(b.lobby!.hostId).toBe('u-Mom');
  });

  it('refuses a missing or forged session', async () => {
    t = await startTestServer();
    const client = new Client(t.baseUrl);
    await expect(client.joinOrCreate(TABLE_ROOM, { instanceId: 'x' })).rejects.toThrow();
    const forged = signSession({ id: 'u', name: 'u', avatar: null }, 'z'.repeat(32));
    await expect(
      client.joinOrCreate(TABLE_ROOM, { instanceId: 'x', session: forged }),
    ).rejects.toThrow();
  });

  it('only lets the host change settings or start', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    expect(await b.expectError(MSG_START)).toBe('NOT_HOST');
    expect(await b.expectError(MSG_SETTINGS, { cardsPerPlayer: 2 })).toBe('NOT_HOST');
    expect(await a.expectError(MSG_SETTINGS, { cardsPerPlayer: 9 })).toBe('BAD_INTENT');
    expect(await a.expectError(MSG_ROLL)).toBe('NOT_STARTED');
  });

  it('passes the host on when the host leaves the lobby', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    await a.room.leave();
    await until(() => b.lobby!.seats.length === 1, 'seat freed');
    expect(b.lobby!.hostId).toBe('u-Mom');
  });

  it('enforces turn order and rolls exactly the free dice', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1, playStyle: 'turns', turnOrder: 'fixed' });
    expect(b.snapshot!.setup!.turnOrder).toEqual([0, 1]);

    expect(await b.expectError(MSG_ROLL)).toBe('NOT_YOUR_TURN');
    expect(await a.act(MSG_ROLL)).toBe('move');
    expect((a.moves.at(-1) as RollMove).values).toHaveLength(5);
    await a.act(MSG_HOLD, { die: 0, held: true });
    await a.act(MSG_HOLD, { die: 3, held: true });
    expect(await a.act(MSG_ROLL)).toBe('move');
    expect((a.moves.at(-1) as RollMove).values).toHaveLength(3);
    // b saw the same log.
    await until(() => b.moves.length === a.moves.length, 'b catches up');
    expect(b.moves).toEqual(a.moves);
    expect(await a.expectError(MSG_HOLD, { die: 7, held: true })).toBe('BAD_DIE');
    expect(await a.expectError(MSG_SCORE, { card: 0, box: 'nope' })).toBe('BAD_INTENT');
  });

  it('lets a player take back a score until the next roll', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1, playStyle: 'turns' });
    await a.act(MSG_ROLL);
    await a.act(MSG_SCORE, { card: 0, box: 'chance' });
    expect(await a.act(MSG_UNDO)).toBe('move');
    expect(a.game.players[0]!.cards[0]!.boxes.chance).toBeUndefined();
    expect(await a.expectError(MSG_UNDO)).toBe('NOTHING_TO_UNDO');
  });

  it('gives a rejoining player the same seat and the full log', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1, playStyle: 'turns' });
    await playTurn(a);
    await b.room.leave();
    await until(() => a.lobby!.seats[1]!.connected === false, 'Mom shown away');
    expect(a.lobby!.seats).toHaveLength(2);

    const back = await join('Mom');
    expect(back.seat).toBe(1);
    expect(back.moves).toEqual(a.moves);
    await until(() => a.lobby!.seats[1]!.connected, 'Mom shown back');
    await playTurn(back);
  });

  it('seats late arrivals as spectators who cannot act', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    const c = await join('Mema');
    expect(c.lobby!.spectators.map((s) => s.name)).toEqual(['Mema']);
    expect(c.seat).toBe(-1);
    expect(await c.expectError(MSG_ROLL)).toBe('NOT_SEATED');
  });

  it('shuffles the turn order when asked', async () => {
    t = await startTestServer();
    const players = [await join('A')];
    for (const n of ['B', 'C', 'D', 'E', 'F']) players.push(await join(n));
    await startGame(players[0]!, players.slice(1), { turnOrder: 'random' });
    expect([...players[0]!.snapshot!.setup!.turnOrder].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it.each(['turns', 'together'] as const)('plays a full 1-card game (%s)', async (playStyle) => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1, playStyle });
    for (let turn = 0; turn < 13; turn++) {
      if (playStyle === 'turns') {
        await playTurn(a);
        await playTurn(b);
      } else {
        await Promise.all([playTurn(a), playTurn(b)]);
      }
    }
    await until(() => a.moves.length === b.moves.length, 'logs match');
    expect(a.game.finished).toBe(true);
    expect(b.game.finished).toBe(true);
    expect(await a.expectError(MSG_ROLL)).toBe('GAME_OVER');
  });

  it('closes an empty table after the timeout', async () => {
    t = await startTestServer({}, { table: { emptyTimeoutMs: 100 } });
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    const firstRoom = a.room.roomId;
    await a.room.leave();
    await new Promise((r) => setTimeout(r, 300));
    const again = await join('Madi');
    expect(again.room.roomId).not.toBe(firstRoom);
    expect(again.snapshot!.setup).toBeNull();
  });

  it('keeps an empty table open within the timeout', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    await a.room.leave();
    const again = await join('Madi');
    expect(again.room.roomId).toBe(a.room.roomId);
    expect(again.snapshot!.setup).not.toBeNull();
  });
});

describe('mergeSettings', () => {
  it('accepts valid fields and rejects anything else', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, { multipliers: false })).toEqual({
      ...DEFAULT_SETTINGS,
      multipliers: false,
    });
    for (const bad of [
      null,
      [],
      { cardsPerPlayer: 0 },
      { cardsPerPlayer: 6 },
      { cardsPerPlayer: 2.5 },
      { playStyle: 'solo' },
      { multipliers: 'yes' },
      { turnOrder: 'alpha' },
      { hostId: 'me' },
    ]) {
      expect(mergeSettings(DEFAULT_SETTINGS, bad)).toBeNull();
    }
  });
});
