import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import {
  cardOptions,
  computePayouts,
  type GameState,
  type Move,
  replay,
  type RollMove,
} from '@rollhouse/rules';
import {
  DEFAULT_SETTINGS,
  type ErrorMessage,
  type Lobby,
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
  MSG_BUY,
  MSG_EQUIP,
  MSG_GOAL,
  MSG_REACT,
  MSG_REACTION,
  MSG_WALLET,
  type ReactionMessage,
  type SessionUser,
  shopEntry,
  type ShopEntry,
  type Snapshot,
  TABLE_ROOM,
  type WalletMessage,
} from '@rollhouse/shared';
import { getBalance, openDatabase, payOut } from '../db';
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
  reactions: ReactionMessage[] = [];
  /** The latest payout message, once the game has been paid. */
  payout: PayoutMessage | null = null;
  /** This player's own account: from the snapshot, then every wallet message. */
  wallet: WalletMessage | null = null;
  wallets = 0;
  /** The tumble seed of each roll message, in order. */
  tumbles: (number | undefined)[] = [];
  constructor(
    readonly user: SessionUser,
    readonly room: Room,
  ) {
    room.onMessage(MSG_SNAPSHOT, (s: Snapshot) => {
      this.snapshot = s;
      this.lobby = s.lobby;
      this.moves = [...s.moves];
      this.wallet = s.wallet ?? null;
    });
    room.onMessage(MSG_WALLET, (w: WalletMessage) => {
      this.wallet = w;
      this.wallets++;
    });
    room.onMessage(MSG_LOBBY, (l: Lobby) => (this.lobby = l));
    room.onMessage(MSG_MOVE, (m: MoveMessage) => {
      expect(m.index).toBe(this.moves.length);
      this.moves.push(m.move);
      if (m.move.type === 'roll') this.tumbles.push(m.tumble);
    });
    room.onMessage(MSG_ERROR, (e: ErrorMessage) => this.errors.push(e));
    room.onMessage(MSG_REACTION, (r: ReactionMessage) => this.reactions.push(r));
    room.onMessage(MSG_PAYOUT, (m: PayoutMessage) => (this.payout = m));
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

async function join(
  name: string,
  instanceId = 'inst-1',
  id = `u-${name}`,
  extra: object = {},
): Promise<Player> {
  const user: SessionUser = { id, name, avatar: null };
  const room = await new Client(t!.baseUrl).joinOrCreate(TABLE_ROOM, {
    instanceId,
    session: signSession(user, TEST_SECRET),
    ...extra,
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
    // Every roll carries a tumble seed, the same for everyone watching.
    expect(a.tumbles).toHaveLength(2);
    for (const seed of a.tumbles) expect(Number.isInteger(seed)).toBe(true);
    expect(b.tumbles).toEqual(a.tumbles);
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

  it('gives each seat its own tint, honoring the pick when it is free', async () => {
    t = await startTestServer();
    const a = await join('Madi', 'inst-1', 'u-Madi', { tint: 'heather' });
    const b = await join('Mom', 'inst-1', 'u-Mom', { tint: 'primrose' });
    const c = await join('Mema', 'inst-1', 'u-Mema', { tint: 'heather' });
    const d = await join('Kid', 'inst-1', 'u-Kid', { tint: 'mud' });
    await until(() => a.lobby!.seats.length === 4, 'four seats');
    expect(a.lobby!.seats.map((s) => s.tint)).toEqual(['heather', 'primrose', 'rose', 'seaglass']);

    // Changing tint: a free pick applies; a taken one leaves the tint as it was.
    c.room.send(MSG_TINT, { tint: 'walnut' });
    await until(() => a.lobby!.seats[2]!.tint === 'walnut', 'walnut');
    d.room.send(MSG_TINT, { tint: 'heather' });
    d.room.send(MSG_TINT, { tint: 'marigold' });
    await until(() => a.lobby!.seats[3]!.tint === 'marigold', 'marigold');
    expect(a.lobby!.seats.map((s) => s.tint)).toEqual([
      'heather',
      'primrose',
      'walnut',
      'marigold',
    ]);
    expect(await d.expectError(MSG_TINT, { tint: 'mud' })).toBe('BAD_INTENT');

    // A dropped seat frees its tint; a rejoin whose pick is taken gets the first free one.
    await b.room.leave();
    const b2 = await join('Mom', 'inst-1', 'u-Mom', { tint: 'walnut' });
    expect(b2.lobby!.seats.find((s) => s.user.id === 'u-Mom')!.tint).toBe('rose');
    // After the start, tints are locked.
    await startGame(a, [b2, c, d], {});
    expect(await a.expectError(MSG_TINT, { tint: 'primrose' })).toBe('STARTED');
  });

  it('sends a sticker to everyone at the table, one per person per cooldown', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    const b = await join('Mom');
    a.room.send(MSG_REACT, { sticker: 'ooglyBoogly' });
    await until(() => a.reactions.length === 1 && b.reactions.length === 1, 'the sticker');
    expect(b.reactions[0]).toEqual({ id: 1, userId: 'u-Madi', sticker: 'ooglyBoogly' });

    // A second one straight away is dropped; someone else's still goes through.
    a.room.send(MSG_REACT, { sticker: 'heart' });
    b.room.send(MSG_REACT, { sticker: 'steamingGarbage' });
    await until(() => a.reactions.length === 2, "Mom's sticker");
    await new Promise((r) => setTimeout(r, 100));
    expect(a.reactions.map((r) => r.sticker)).toEqual(['ooglyBoogly', 'steamingGarbage']);

    expect(await a.expectError(MSG_REACT, { sticker: 'confetti' })).toBe('BAD_INTENT');
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
    expect(mergeSettings(DEFAULT_SETTINGS, { multipliers: true })).toEqual({
      ...DEFAULT_SETTINGS,
      multipliers: true,
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

describe('coin payouts', () => {
  const dirs: string[] = [];
  const dbs: DatabaseSync[] = [];
  afterEach(() => {
    for (const db of dbs.splice(0)) {
      try {
        db.close();
      } catch {
        // a test closed it on purpose
      }
    }
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const openDb = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rollhouse-pay-'));
    dirs.push(dir);
    const db = openDatabase(dir);
    dbs.push(db);
    return db;
  };
  const withDb = async (db: DatabaseSync, table: object = {}) => {
    t = await startTestServer({}, { db, table });
  };
  const payouts = (db: DatabaseSync) =>
    db.prepare('SELECT game_id, user_id, coins FROM payouts ORDER BY user_id').all() as {
      game_id: string;
      user_id: string;
      coins: number;
    }[];
  const playerRows = (db: DatabaseSync) => db.prepare('SELECT user_id FROM wallets').all();
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  /** Plays a 1-card game to the end, one 13-turn pass for everyone. */
  async function playOut(players: Player[], style: 'turns' | 'together' = 'turns') {
    for (let turn = 0; turn < 13; turn++) {
      if (style === 'turns') for (const p of players) await playTurn(p);
      else await Promise.all(players.map((p) => playTurn(p)));
    }
    await until(() => players.every((p) => p.moves.length === players[0]!.moves.length), 'logs');
  }

  it('pays every seat once, the winner a bonus, and names the game with a UUID', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    await playOut([a, b]);
    expect(a.game.finished).toBe(true);

    const expected = computePayouts(a.game);
    const rows = payouts(db);
    expect(rows.map((r) => r.user_id)).toEqual(['u-Madi', 'u-Mom']);
    expect(rows.map((r) => r.coins)).toEqual([expected[a.seat]!.total, expected[b.seat]!.total]);
    expect(rows.every((r) => UUID.test(r.game_id))).toBe(true);
    expect(new Set(rows.map((r) => r.game_id)).size).toBe(1);
    expect(getBalance(db, 'u-Madi')).toBe(expected[a.seat]!.total);
    expect(getBalance(db, 'u-Mom')).toBe(expected[b.seat]!.total);
    // Finishing pays everyone; the winner(s) get more than a plain finish.
    const finish = expected[0]!.breakdown.finish;
    expect(Math.max(...rows.map((r) => r.coins))).toBeGreaterThan(finish);
  });

  it('gives each game its own id', async () => {
    const db = openDb();
    await withDb(db);
    for (const table of ['inst-1', 'inst-2']) {
      const a = await join('Madi', table);
      await startGame(a, [], { cardsPerPlayer: 1 });
      await playOut([a]);
    }
    const rows = payouts(db);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.game_id)).size).toBe(2);
    expect(rows.every((r) => UUID.test(r.game_id))).toBe(true);
    expect(getBalance(db, 'u-Madi')).toBe(2); // a solo game pays a flat 1 coin
  });

  it('pays spectators nothing', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    const c = await join('Mema');
    expect(c.seat).toBe(-1);
    await playOut([a, b]);
    expect(payouts(db).map((r) => r.user_id)).toEqual(['u-Madi', 'u-Mom']);
    expect(playerRows(db)).toHaveLength(2);
    expect(getBalance(db, 'u-Mema')).toBe(0);
  });

  it('pays guests nothing unless guest payouts are on, and then creates no player row', async () => {
    const db = openDb();
    await withDb(db);
    const g = await join('Gus', 'inst-1', 'guest-gus');
    await startGame(g, [], { cardsPerPlayer: 1 });
    await playOut([g]);
    expect(payouts(db)).toEqual([]);
    expect(playerRows(db)).toEqual([]);
    await t!.close();
    t = undefined;

    const dev = openDb();
    await withDb(dev, { guestPayouts: true });
    const h = await join('Hal', 'inst-1', 'guest-hal');
    await startGame(h, [], { cardsPerPlayer: 1 });
    await playOut([h]);
    expect(payouts(dev).map((r) => r.user_id)).toEqual(['guest-hal']);
    expect(getBalance(dev, 'guest-hal')).toBe(1);
  });

  it('pays nothing for a game that is not finished', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    for (let i = 0; i < 3; i++) {
      await playTurn(a);
      await playTurn(b);
    }
    expect(a.game.finished).toBe(false);
    expect(payouts(db)).toEqual([]);
    expect(playerRows(db)).toEqual([]);
  });

  it('still pays a seat whose player is disconnected when the game ends', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1, playStyle: 'together' });
    for (let turn = 0; turn < 13; turn++) await playTurn(b);
    await b.room.leave();
    await until(() => !a.lobby!.seats[1]!.connected, 'Mom to be gone');
    for (let turn = 0; turn < 13; turn++) await playTurn(a);
    await until(() => payouts(db).length === 2, 'both seats paid');
    expect(payouts(db).map((r) => r.user_id)).toEqual(['u-Madi', 'u-Mom']);
  });

  it('lets no client message create or change a payout', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    // The server has no payout messages, and drops a client that invents one.
    for (const type of ['payout', 'coins', 'pay', 'balance']) {
      const eve = await join('Eve', 'inst-1', `u-eve-${type}`);
      eve.room.send(type, { userId: 'u-Madi', coins: 999 });
      await until(() => eve.room.connection.isOpen === false, `${type} to be refused`);
    }
    expect(getBalance(db, 'u-Madi')).toBe(0);
    expect(payouts(db)).toEqual([]);
    await playOut([a]);
    expect(payouts(db).map((r) => [r.user_id, r.coins])).toEqual([['u-Madi', 1]]);
  });

  it('keeps balances across a server restart', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rollhouse-pay-'));
    dirs.push(dir);
    const first = openDatabase(dir);
    await withDb(first);
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    await playOut([a]);
    expect(getBalance(first, 'u-Madi')).toBe(1);
    await t!.close();
    t = undefined;
    first.close();

    // A new server on the same data directory, as after a deploy or a crash.
    const second = openDatabase(dir);
    dbs.push(second);
    await withDb(second);
    expect(getBalance(second, 'u-Madi')).toBe(1);
    const again = await join('Madi', 'inst-2');
    await startGame(again, [], { cardsPerPlayer: 1 });
    await playOut([again]);
    expect(getBalance(second, 'u-Madi')).toBe(2);
    expect(payouts(second)).toHaveLength(2);
  });

  it('tells every client what was earned, and each their own balance', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    const c = await join('Mema');
    await playOut([a, b]);
    await until(() => [a, b, c].every((p) => p.payout !== null), 'the payout message');

    const expected = computePayouts(a.game);
    const bySeat = (seat: number) => ({
      userId: seat === a.seat ? 'u-Madi' : 'u-Mom',
      coins: expected[seat]!.total,
      ...expected[seat]!.breakdown,
    });
    const seats = [bySeat(a.seat), bySeat(b.seat)].sort((x, y) => x.userId.localeCompare(y.userId));
    for (const p of [a, b, c]) {
      expect([...p.payout!.seats].sort((x, y) => x.userId.localeCompare(y.userId))).toEqual(seats);
    }
    expect(a.payout!.balance).toBe(getBalance(db, 'u-Madi'));
    expect(b.payout!.balance).toBe(getBalance(db, 'u-Mom'));
    // A spectator sees what everyone earned but has no balance of their own.
    expect(c.payout!.balance).toBeNull();
  });

  it('puts the payout in the snapshot of anyone who joins or comes back later', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    await playOut([a, b]);
    await until(() => a.payout !== null && b.payout !== null, 'the payout message');

    const back = await join('Madi'); // the same player, on a new device
    expect(back.snapshot!.payout).toEqual(a.payout);
    const late = await join('Gran');
    expect(late.snapshot!.payout!.balance).toBeNull();
    expect(late.snapshot!.payout!.seats).toEqual(a.payout!.seats);
  });

  it('sends no payout before the game is finished', async () => {
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    await playTurn(a);
    await playTurn(b);
    expect(a.payout).toBeNull();
    expect((await join('Gran')).snapshot!.payout).toBeUndefined();
  });

  it('sends no payout when nobody was paid', async () => {
    const db = openDb();
    await withDb(db);
    const g = await join('Gus', 'inst-1', 'guest-gus');
    await startGame(g, [], { cardsPerPlayer: 1 });
    await playOut([g]);
    await new Promise((r) => setTimeout(r, 50));
    expect(g.payout).toBeNull();
    expect((await join('Hal', 'inst-1', 'guest-hal')).snapshot!.payout).toBeUndefined();
  });

  it('ends the game normally, and logs, when the payout cannot be recorded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = openDb();
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    await startGame(a, [b], { cardsPerPlayer: 1 });
    db.close();
    await playOut([a, b]);
    expect(a.game.finished).toBe(true);
    expect(b.game.finished).toBe(true);
    expect(a.errors).toEqual([]);
    expect(a.payout).toBeNull();
    expect(b.payout).toBeNull();
    expect((await join('Late')).snapshot!.payout).toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/payout failed/), expect.anything());
  });
});

describe('the shop', () => {
  const dirs: string[] = [];
  const dbs: DatabaseSync[] = [];
  afterEach(() => {
    for (const db of dbs.splice(0)) {
      try {
        db.close();
      } catch {
        // a test closed it on purpose
      }
    }
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const breakdown = { finish: 10, win: 0, yatzy: 0 };
  /** A database where `u-Madi` has earned `coins`. */
  const openDb = (coins = 100) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rollhouse-shop-'));
    dirs.push(dir);
    const db = openDatabase(dir);
    dbs.push(db);
    if (coins > 0) payOut(db, 'seed', [{ userId: 'u-Madi', coins, breakdown }]);
    return db;
  };
  const withDb = async (db: DatabaseSync, table: object = {}, env: NodeJS.ProcessEnv = {}) => {
    t = await startTestServer(env, { db, table });
  };
  const own = (db: DatabaseSync, userId: string, itemId: string) =>
    db.prepare("INSERT INTO inventory VALUES (?, ?, 40, 'seed')").run(userId, itemId);

  /** Sends a shop message and waits for the wallet (and any error) that answers it. */
  async function shop(p: Player, type: string, body?: unknown) {
    const wallets = p.wallets;
    const errors = p.errors.length;
    p.room.send(type, body);
    await until(() => p.wallets > wallets, `${type} to be answered`);
    return { wallet: p.wallet!, error: p.errors.length > errors ? p.errors.at(-1)! : null };
  }

  it('sends each player their own wallet when they join', async () => {
    const db = openDb(100);
    own(db, 'u-Madi', 'violetMurk');
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    expect(a.wallet).toEqual({
      balance: 100,
      owned: ['violetMurk'],
      equipped: {},
      goal: null,
      canBuy: true,
    });
    expect(b.wallet).toEqual({ balance: 0, owned: [], equipped: {}, goal: null, canBuy: true });
  });

  it('buys at the catalog price, whatever price the client claims', async () => {
    const db = openDb(100);
    await withDb(db);
    const a = await join('Madi');
    const { wallet, error } = await shop(a, MSG_BUY, { item: 'violetMurk', price: 1, user: 'x' });
    expect(error).toBeNull();
    expect(wallet).toMatchObject({ balance: 60, owned: ['violetMurk'] });
    expect(getBalance(db, 'u-Madi')).toBe(60);
  });

  it('never charges twice for a retry, and says so', async () => {
    const db = openDb(100);
    await withDb(db);
    const a = await join('Madi');
    await shop(a, MSG_BUY, { item: 'violetMurk' });
    for (let i = 0; i < 2; i++) {
      const { wallet, error } = await shop(a, MSG_BUY, { item: 'violetMurk' });
      expect(error?.code).toBe('ALREADY_OWNED');
      expect(wallet.balance).toBe(60);
    }
    expect(getBalance(db, 'u-Madi')).toBe(60);
  });

  /** The real catalog, except that these two items are coming soon whatever the catalog says today. */
  const soonLookup = (id: unknown): ShopEntry | undefined => {
    const e = shopEntry(id);
    return e && ['bone', 'ghostParade'].includes(e.id) ? { ...e, available: false } : e;
  };

  it('refuses what is coming soon, unknown, unaffordable or malformed', async () => {
    const db = openDb(50);
    await withDb(db, { shopLookup: soonLookup });
    const a = await join('Madi');
    const codes: string[] = [];
    for (const body of [
      { item: 'bone' },
      { item: 'ghostParade' },
      { item: 'nothing' },
      { item: 5 },
      {},
      'violetMurk',
      null,
    ]) {
      codes.push((await shop(a, MSG_BUY, body)).error!.code);
    }
    expect(codes).toEqual([
      'NOT_AVAILABLE',
      'NOT_AVAILABLE',
      'UNKNOWN_ITEM',
      'UNKNOWN_ITEM',
      'UNKNOWN_ITEM',
      'UNKNOWN_ITEM',
      'UNKNOWN_ITEM',
    ]);
    await shop(a, MSG_BUY, { item: 'violetMurk' });
    const poor = await shop(a, MSG_BUY, { item: 'obsidian' });
    expect(poor.error?.code).toBe('NOT_ENOUGH_COINS');
    expect(getBalance(db, 'u-Madi')).toBe(10);
  });

  it('tells every device of a player, and nobody else', async () => {
    const db = openDb(100);
    await withDb(db);
    const phone = await join('Madi', 'inst-1', 'u-Madi');
    const laptop = await join('Madi', 'inst-1', 'u-Madi');
    const mom = await join('Mom');
    const before = mom.wallets;
    await shop(phone, MSG_BUY, { item: 'violetMurk' });
    await until(() => laptop.wallet?.balance === 60, 'the second device to hear');
    expect(laptop.wallet!.owned).toEqual(['violetMurk']);
    expect(mom.wallets).toBe(before);
    expect(mom.wallet!.balance).toBe(0);
    // Nothing in the lobby carries a balance or inventory.
    expect(JSON.stringify(mom.lobby)).not.toContain('violetMurk');
  });

  it('acts only for the signed-in player, never a user named in the message', async () => {
    const db = openDb(100);
    await withDb(db);
    const a = await join('Madi');
    const mom = await join('Mom');
    const { error } = await shop(mom, MSG_BUY, { item: 'violetMurk', userId: 'u-Madi' });
    expect(error?.code).toBe('NOT_ENOUGH_COINS');
    expect(getBalance(db, 'u-Madi')).toBe(100);
    const eq = await shop(mom, MSG_EQUIP, { slot: 'diceSkin', item: 'bone', userId: 'u-Madi' });
    expect(eq.error?.code).toBe('NOT_OWNED');
    expect(a.wallet!.balance).toBe(100);
  });

  it('refuses a guest unless guest payouts are on, and a table with no database', async () => {
    const db = openDb(0);
    await withDb(db, { guestPayouts: false });
    const g = await join('Gia', 'inst-1', 'guest-1');
    expect(g.wallet).toMatchObject({ canBuy: false, balance: 0 });
    payOut(db, 'seed', [{ userId: 'guest-1', coins: 100, breakdown }]);
    const { error } = await shop(g, MSG_BUY, { item: 'violetMurk' });
    expect(error?.code).toBe('SHOP_CLOSED');
    expect(getBalance(db, 'guest-1')).toBe(100);
    expect((await shop(g, MSG_GOAL, { item: 'violetMurk' })).error?.code).toBe('SHOP_CLOSED');
    await t!.close();

    // Where guests are paid (dev and e2e), they can shop.
    t = await startTestServer({}, { db, table: { guestPayouts: true } });
    const g2 = await join('Gia', 'inst-2', 'guest-1');
    expect(g2.wallet).toMatchObject({ canBuy: true, balance: 100 });
    expect((await shop(g2, MSG_BUY, { item: 'violetMurk' })).error).toBeNull();
    await t.close();

    t = await startTestServer();
    const none = await join('Madi');
    expect(none.wallet).toEqual({ balance: 0, owned: [], equipped: {}, goal: null, canBuy: false });
    expect((await shop(none, MSG_BUY, { item: 'violetMurk' })).error?.code).toBe('SHOP_CLOSED');
  });

  it('equips and unequips an owned item, and the whole table sees it', async () => {
    const db = openDb(0);
    own(db, 'u-Madi', 'bone');
    own(db, 'u-Madi', 'swamp');
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    expect(b.lobby!.seats[0]).not.toHaveProperty('equipped');

    const on = await shop(a, MSG_EQUIP, { slot: 'diceSkin', item: 'bone' });
    expect(on.error).toBeNull();
    expect(on.wallet.equipped).toEqual({ diceSkin: 'bone' });
    await until(() => b.lobby!.seats[0]!.equipped?.diceSkin === 'bone', 'Mom to see it');
    await shop(a, MSG_EQUIP, { slot: 'brew', item: 'swamp' });
    await until(() => b.lobby!.seats[0]!.equipped?.brew === 'swamp', 'the brew');
    expect(b.lobby!.seats[1]).not.toHaveProperty('equipped');

    await shop(a, MSG_EQUIP, { slot: 'diceSkin', item: null });
    await until(() => b.lobby!.seats[0]!.equipped?.diceSkin === undefined, 'it to come off');
    expect(b.lobby!.seats[0]!.equipped).toEqual({ brew: 'swamp' });

    // It is remembered: a new connection sits down wearing it.
    await a.room.leave();
    await until(() => b.lobby!.seats.length === 1, 'Madi to leave');
    const again = await join('Madi');
    expect(again.lobby!.seats.find((s) => s.user.id === 'u-Madi')!.equipped).toEqual({
      brew: 'swamp',
    });
    expect(again.wallet!.equipped).toEqual({ brew: 'swamp' });
  });

  it('refuses to equip what you do not own, in the wrong slot, or that does not exist', async () => {
    const db = openDb(0);
    own(db, 'u-Madi', 'swamp');
    await withDb(db);
    const a = await join('Madi');
    const codes: string[] = [];
    for (const body of [
      { slot: 'diceSkin', item: 'bone' },
      { slot: 'diceSkin', item: 'swamp' },
      { slot: 'diceSkin', item: 'ghost' },
      { slot: 'hat', item: 'swamp' },
      { item: 'swamp' },
      'swamp',
    ]) {
      codes.push((await shop(a, MSG_EQUIP, body)).error!.code);
    }
    expect(codes).toEqual([
      'NOT_OWNED',
      'UNKNOWN_ITEM',
      'UNKNOWN_ITEM',
      'BAD_INTENT',
      'BAD_INTENT',
      'BAD_INTENT',
    ]);
    expect(a.wallet!.equipped).toEqual({});
  });

  it('only lets you change your look in the lobby', async () => {
    const db = openDb(0);
    own(db, 'u-Madi', 'bone');
    await withDb(db);
    const a = await join('Madi');
    await shop(a, MSG_EQUIP, { slot: 'diceSkin', item: 'bone' });
    await startGame(a, [], { cardsPerPlayer: 1 });
    expect(await a.expectError(MSG_EQUIP, { slot: 'diceSkin', item: null })).toBe('STARTED');
    // The look the seat started with is still the one the table sees.
    expect(a.lobby!.seats[0]!.equipped).toEqual({ diceSkin: 'bone' });
    expect(getEquippedRow(db)).toEqual([{ slot: 'diceSkin', item_id: 'bone' }]);
  });

  it('keeps the look a seat started with, even if its player reconnects', async () => {
    const db = openDb(0);
    own(db, 'u-Madi', 'bone');
    await withDb(db);
    const a = await join('Madi');
    await shop(a, MSG_EQUIP, { slot: 'diceSkin', item: 'bone' });
    await startGame(a, [], { cardsPerPlayer: 1 });
    await a.room.leave();
    const back = await join('Madi');
    expect(back.lobby!.seats[0]!.equipped).toEqual({ diceSkin: 'bone' });
  });

  it('pins a goal, follows it to another device, and clears it when bought', async () => {
    const db = openDb(100);
    await withDb(db, { shopLookup: soonLookup });
    const a = await join('Madi');
    expect((await shop(a, MSG_GOAL, { item: 'obsidian' })).wallet.goal).toBe('obsidian');
    const other = await join('Madi', 'inst-2', 'u-Madi');
    expect(other.wallet!.goal).toBe('obsidian');
    expect((await shop(a, MSG_GOAL, { item: 'bone' })).error?.code).toBe('NOT_AVAILABLE');
    expect((await shop(a, MSG_GOAL, {})).error?.code).toBe('UNKNOWN_ITEM');
    expect((await shop(a, MSG_BUY, { item: 'obsidian' })).wallet.goal).toBeNull();
    expect((await shop(a, MSG_GOAL, { item: 'obsidian' })).error?.code).toBe('ALREADY_OWNED');
    expect((await shop(a, MSG_GOAL, { item: 'violetMurk' })).wallet.goal).toBe('violetMurk');
    expect((await shop(a, MSG_GOAL, { item: null })).wallet.goal).toBeNull();
  });

  it('lets a watcher shop for themselves but not be seen wearing anything', async () => {
    const db = openDb(100);
    own(db, 'u-Eve', 'bone');
    await withDb(db);
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    const eve = await join('Eve', 'inst-1', 'u-Eve');
    expect((await shop(eve, MSG_BUY, { item: 'violetMurk' })).error?.code).toBe('NOT_ENOUGH_COINS');
    expect(eve.lobby!.spectators.map((u) => u.name)).toEqual(['Eve']);
  });

  it('takes pack stickers only from the player who owns the pack', async () => {
    const db = openDb(100);
    await withDb(db);
    const a = await join('Madi');
    const b = await join('Mom');
    // A pack sticker without the pack is refused, and nobody sees it.
    expect(await sendSticker(a, 'ribbit')).toBe('NOT_OWNED');
    expect(b.reactions).toEqual([]);
    // A default sticker is free.
    expect(await sendSticker(a, 'cheering')).toBeNull();

    // Packs are not for sale right now, so the player is given one directly.
    own(db, 'u-Madi', 'cauldronCrew');
    await new Promise((r) => setTimeout(r, 1300));
    expect(await sendSticker(a, 'ribbit')).toBeNull();
    await until(() => b.reactions.some((r) => r.sticker === 'ribbit'), 'Mom to see ribbit');
    // The other pack is still locked, and Mom, who owns nothing, cannot send ribbit.
    await new Promise((r) => setTimeout(r, 1300));
    expect(await sendSticker(a, 'broom')).toBe('NOT_OWNED');
    expect(await sendSticker(b, 'ribbit')).toBe('NOT_OWNED');
  });

  it('refuses pack stickers where there is no database', async () => {
    t = await startTestServer();
    const a = await join('Madi');
    expect(await sendSticker(a, 'ribbit')).toBe('NOT_OWNED');
  });

  it('sends the new balance after a game pays out', async () => {
    const db = openDb(0);
    await withDb(db);
    const a = await join('Madi');
    await startGame(a, [], { cardsPerPlayer: 1 });
    const before = a.wallets;
    for (let turn = 0; turn < 13; turn++) await playTurn(a);
    await until(() => a.wallets > before, 'the wallet after the payout');
    expect(a.wallet!.balance).toBe(getBalance(db, 'u-Madi'));
    expect(a.wallet!.balance).toBeGreaterThan(0);
  });

  it('answers with an error, not a crash, when the database fails', async () => {
    const db = openDb(100);
    await withDb(db);
    const a = await join('Madi');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.exec('DROP TABLE inventory');
    const { error } = await shop(a, MSG_BUY, { item: 'violetMurk' });
    expect(error?.code).toBe('SHOP_CLOSED');
    expect(getBalance(db, 'u-Madi')).toBe(100);
    vi.restoreAllMocks();
  });

  /** Sends a sticker and returns the error code, or null when it was accepted. */
  async function sendSticker(p: Player, sticker: string): Promise<string | null> {
    const errors = p.errors.length;
    p.room.send(MSG_REACT, { sticker });
    await new Promise((r) => setTimeout(r, 120));
    return p.errors.length > errors ? p.errors.at(-1)!.code : null;
  }

  function getEquippedRow(db: DatabaseSync) {
    return db.prepare('SELECT slot, item_id FROM equipped').all();
  }
});
