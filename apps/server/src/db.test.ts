import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type ShopEntry, shopEntry } from '@rollhouse/shared';
import {
  buyItem,
  equipItem,
  getBalance,
  getEquipped,
  getWallet,
  openDatabase,
  ownsItem,
  payOut,
  pinGoal,
  recordBoot,
} from './db';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('database', () => {
  it('uses WAL and counts boots across reopen', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rollhouse-db-'));
    dirs.push(dir);
    const db = openDatabase(path.join(dir, 'nested'));
    const mode = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(mode.journal_mode).toBe('wal');
    expect(recordBoot(db, 'a', '0.1.0')).toBe(1);
    db.close();
    const again = openDatabase(path.join(dir, 'nested'));
    expect(recordBoot(again, 'b', '0.1.0')).toBe(2);
    again.close();
  });
});

describe('payouts', () => {
  const open = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rollhouse-db-'));
    dirs.push(dir);
    return { dir, db: openDatabase(dir) };
  };
  const breakdown = { finish: 10, win: 10, yatzy: 3 };

  it('creates the wallets and payouts tables', () => {
    const { db } = open();
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    expect(names.map((n) => n.name)).toEqual(expect.arrayContaining(['wallets', 'payouts']));
    db.close();
  });

  it('writes a row per player and raises each balance', () => {
    const { db } = open();
    expect(
      payOut(db, 'g1', [
        { userId: 'a', coins: 23, breakdown },
        { userId: 'b', coins: 10, breakdown: { finish: 10, win: 0, yatzy: 0 } },
      ]),
    ).toBe(true);
    expect(getBalance(db, 'a')).toBe(23);
    expect(getBalance(db, 'b')).toBe(10);
    const rows = db.prepare('SELECT user_id, coins, breakdown FROM payouts ORDER BY user_id').all();
    expect(rows).toHaveLength(2);
    expect(JSON.parse((rows[0] as { breakdown: string }).breakdown)).toEqual(breakdown);
    db.close();
  });

  it('adds to a balance across games', () => {
    const { db } = open();
    payOut(db, 'g1', [{ userId: 'a', coins: 10, breakdown }]);
    payOut(db, 'g2', [{ userId: 'a', coins: 7, breakdown }]);
    expect(getBalance(db, 'a')).toBe(17);
    db.close();
  });

  it('pays the same game only once', () => {
    const { db } = open();
    const rows = [{ userId: 'a', coins: 10, breakdown }];
    expect(payOut(db, 'g1', rows)).toBe(true);
    expect(payOut(db, 'g1', rows)).toBe(false);
    expect(getBalance(db, 'a')).toBe(10);
    expect(db.prepare('SELECT COUNT(*) AS n FROM payouts').get()).toEqual({ n: 1 });
    db.close();
  });

  it('pays only the players not yet paid for that game', () => {
    const { db } = open();
    payOut(db, 'g1', [{ userId: 'a', coins: 10, breakdown }]);
    expect(
      payOut(db, 'g1', [
        { userId: 'a', coins: 10, breakdown },
        { userId: 'b', coins: 5, breakdown },
      ]),
    ).toBe(true);
    expect(getBalance(db, 'a')).toBe(10);
    expect(getBalance(db, 'b')).toBe(5);
    db.close();
  });

  it('rolls everything back when one row fails', () => {
    const { db } = open();
    expect(() =>
      payOut(db, 'g1', [
        { userId: 'a', coins: 10, breakdown },
        { userId: 'b', coins: -1, breakdown },
      ]),
    ).toThrow();
    expect(getBalance(db, 'a')).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM payouts').get()).toEqual({ n: 0 });
    expect(db.isTransaction).toBe(false);
    db.close();
  });

  it('keeps balances after the database is closed and reopened', () => {
    const { dir, db } = open();
    payOut(db, 'g1', [{ userId: 'a', coins: 12, breakdown }]);
    db.close();
    const again = openDatabase(dir);
    expect(getBalance(again, 'a')).toBe(12);
    expect(payOut(again, 'g1', [{ userId: 'a', coins: 12, breakdown }])).toBe(false);
    expect(getBalance(again, 'a')).toBe(12);
    again.close();
  });

  it('works in a database left with the old reverted coins tables', () => {
    // An earlier version of coins (since reverted) made a `players` table with other
    // columns and a `ledger`. Those may still sit in staging or production.
    const { dir, db } = open();
    db.exec(`
      CREATE TABLE players (user_id TEXT PRIMARY KEY, name TEXT NOT NULL,
        coins INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
      CREATE TABLE ledger (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, delta INTEGER NOT NULL,
        reason TEXT NOT NULL, game_id TEXT, at TEXT NOT NULL, UNIQUE (user_id, game_id, reason));
    `);
    db.close();
    const again = openDatabase(dir);
    expect(payOut(again, 'g1', [{ userId: 'a', coins: 9, breakdown }])).toBe(true);
    expect(getBalance(again, 'a')).toBe(9);
    again.close();
  });

  it('reports 0 for a player who has never earned', () => {
    const { db } = open();
    expect(getBalance(db, 'nobody')).toBe(0);
    db.close();
  });
});

describe('the shop', () => {
  const breakdown = { finish: 10, win: 0, yatzy: 0 };
  const open = (coins = 0) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rollhouse-db-'));
    dirs.push(dir);
    const db = openDatabase(dir);
    if (coins > 0) payOut(db, 'g0', [{ userId: 'a', coins, breakdown }]);
    return { dir, db };
  };
  /** A catalog whose items are all for sale, because the real ones are not yet. */
  const forSale = (id: unknown): ShopEntry | undefined => {
    const e: Record<string, ShopEntry> = {
      bone: {
        id: 'bone',
        slot: 'diceSkin',
        name: 'Bone',
        rarity: 'common',
        price: 40,
        blurb: '',
        available: true,
      },
      swamp: {
        id: 'swamp',
        slot: 'brew',
        name: 'Swamp',
        rarity: 'common',
        price: 40,
        blurb: '',
        available: true,
      },
    };
    return typeof id === 'string' ? e[id] : undefined;
  };
  /** Marks a real catalog item as coming soon, whatever the catalog says today. */
  const comingSoon = (id: unknown): ShopEntry | undefined => {
    const e = shopEntry(id);
    return e && { ...e, available: false };
  };
  const fail = (code: string) => expect.objectContaining({ ok: false, code });
  const table = (db: ReturnType<typeof open>['db'], name: string) =>
    db.prepare(`SELECT * FROM ${name}`).all();

  it('creates inventory, equipped and goals next to the coin tables', () => {
    const { db } = open();
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]
    ).map((n) => n.name);
    expect(names).toEqual(expect.arrayContaining(['wallets', 'inventory', 'equipped', 'goals']));
    // Not the names an earlier, reverted coins version used.
    expect(names).not.toContain('players');
    expect(names).not.toContain('ledger');
    db.close();
  });

  it('takes the catalog price, adds the item and records what was paid, in one go', () => {
    const { db } = open(100);
    expect(buyItem(db, 'a', 'violetMurk')).toEqual({ ok: true });
    expect(getBalance(db, 'a')).toBe(60);
    expect(ownsItem(db, 'a', 'violetMurk')).toBe(true);
    expect(table(db, 'inventory')).toEqual([
      expect.objectContaining({ user_id: 'a', item_id: 'violetMurk', price_paid: 40 }),
    ]);
    // Every item costs its own catalog price.
    expect(buyItem(db, 'a', 'swamp', forSale)).toEqual({ ok: true });
    expect(getBalance(db, 'a')).toBe(20);
    db.close();
  });

  it('never charges twice for the same item, however often it is retried', () => {
    const { db } = open(200);
    expect(buyItem(db, 'a', 'violetMurk')).toEqual({ ok: true });
    for (let i = 0; i < 3; i++)
      expect(buyItem(db, 'a', 'violetMurk')).toEqual(fail('ALREADY_OWNED'));
    expect(getBalance(db, 'a')).toBe(160);
    expect(table(db, 'inventory')).toHaveLength(1);
    expect(db.isTransaction).toBe(false);
    db.close();
  });

  it('refuses a purchase the player cannot afford, and changes nothing', () => {
    const { db } = open(39);
    expect(buyItem(db, 'a', 'violetMurk')).toEqual(fail('NOT_ENOUGH_COINS'));
    expect(getBalance(db, 'a')).toBe(39);
    expect(table(db, 'inventory')).toEqual([]);
    // Someone who never earned has no wallet row at all.
    expect(buyItem(db, 'nobody', 'violetMurk')).toEqual(fail('NOT_ENOUGH_COINS'));
    expect(table(db, 'wallets')).toHaveLength(1);
    db.close();
  });

  it('can spend exactly everything, down to zero, but not below', () => {
    const { db } = open(40);
    expect(buyItem(db, 'a', 'violetMurk')).toEqual({ ok: true });
    expect(getBalance(db, 'a')).toBe(0);
    expect(buyItem(db, 'a', 'obsidian')).toEqual(fail('NOT_ENOUGH_COINS'));
    expect(getBalance(db, 'a')).toBe(0);
    db.close();
  });

  it('only sells what the catalog lists, and only what is available', () => {
    const { db } = open(1000);
    expect(buyItem(db, 'a', 'free-gold')).toEqual(fail('UNKNOWN_ITEM'));
    expect(buyItem(db, 'a', 42)).toEqual(fail('UNKNOWN_ITEM'));
    expect(buyItem(db, 'a', { id: 'bone', price: 0 })).toEqual(fail('UNKNOWN_ITEM'));
    // Coming soon: in the catalog, not for sale.
    expect(buyItem(db, 'a', 'bone', comingSoon)).toEqual(fail('NOT_AVAILABLE'));
    expect(getBalance(db, 'a')).toBe(1000);
    expect(table(db, 'inventory')).toEqual([]);
    db.close();
  });

  it('rolls back the deduction when recording the item fails', () => {
    const { db } = open(100);
    // Break the second step of the purchase, after the coins have been taken.
    db.exec('DROP TABLE goals');
    expect(() => buyItem(db, 'a', 'violetMurk')).toThrow();
    expect(getBalance(db, 'a')).toBe(100);
    expect(table(db, 'inventory')).toEqual([]);
    expect(db.isTransaction).toBe(false);
    db.close();
  });

  it('keeps the wallet check constraint as a second guard', () => {
    const { db } = open(10);
    expect(() => db.exec("UPDATE wallets SET coins = coins - 11 WHERE user_id = 'a'")).toThrow();
    db.close();
  });

  it('equips an owned item in its slot, replacing the one there, and unequips', () => {
    const { db } = open(1000);
    buyItem(db, 'a', 'bone', forSale);
    buyItem(db, 'a', 'swamp', forSale);
    db.prepare("INSERT INTO inventory VALUES ('a', 'obsidian', 40, 'now')").run();
    expect(equipItem(db, 'a', 'diceSkin', 'bone')).toEqual({ ok: true });
    expect(equipItem(db, 'a', 'brew', 'swamp')).toEqual({ ok: true });
    expect(getEquipped(db, 'a')).toEqual({ diceSkin: 'bone', brew: 'swamp' });
    // One item per slot.
    expect(equipItem(db, 'a', 'diceSkin', 'obsidian')).toEqual({ ok: true });
    expect(getEquipped(db, 'a')).toEqual({ diceSkin: 'obsidian', brew: 'swamp' });
    expect(table(db, 'equipped')).toHaveLength(2);
    expect(equipItem(db, 'a', 'brew', null)).toEqual({ ok: true });
    expect(getEquipped(db, 'a')).toEqual({ diceSkin: 'obsidian' });
    // Taking off an empty slot is fine.
    expect(equipItem(db, 'a', 'brew', null)).toEqual({ ok: true });
    db.close();
  });

  it('refuses to equip what is not owned, not in that slot, or not real', () => {
    const { db } = open(100);
    buyItem(db, 'a', 'swamp', forSale);
    expect(equipItem(db, 'a', 'diceSkin', 'bone')).toEqual(fail('NOT_OWNED'));
    expect(equipItem(db, 'a', 'diceSkin', 'swamp')).toEqual(fail('UNKNOWN_ITEM'));
    expect(equipItem(db, 'a', 'brew', 'bone')).toEqual(fail('UNKNOWN_ITEM'));
    expect(equipItem(db, 'a', 'brew', 7)).toEqual(fail('UNKNOWN_ITEM'));
    expect(equipItem(db, 'a', 'hat', 'swamp')).toEqual(fail('BAD_INTENT'));
    // Pets are gone from the shop, so the slot is no longer one.
    expect(equipItem(db, 'a', 'pet', 'toad')).toEqual(fail('BAD_INTENT'));
    // Someone else's item is not yours.
    expect(equipItem(db, 'b', 'brew', 'swamp')).toEqual(fail('NOT_OWNED'));
    expect(getEquipped(db, 'a')).toEqual({});
    db.close();
  });

  it('ignores an equipped row whose item or slot has left the catalog (pets, for one)', () => {
    const { db } = open();
    db.prepare("INSERT INTO equipped VALUES ('a', 'pet', 'toad')").run();
    db.prepare("INSERT INTO equipped VALUES ('a', 'diceSkin', 'dragon')").run();
    db.prepare("INSERT INTO equipped VALUES ('a', 'brew', 'swamp')").run();
    expect(getEquipped(db, 'a')).toEqual({ brew: 'swamp' });
    db.close();
  });

  it('pins one goal at a time, clears it, and clears it when it is bought', () => {
    const { db } = open(100);
    expect(pinGoal(db, 'a', 'violetMurk')).toEqual({ ok: true });
    expect(getWallet(db, 'a').goal).toBe('violetMurk');
    expect(pinGoal(db, 'a', 'obsidian')).toEqual({ ok: true });
    expect(getWallet(db, 'a').goal).toBe('obsidian');
    expect(table(db, 'goals')).toHaveLength(1);
    // Buying something else leaves the goal alone; buying the goal ends it.
    buyItem(db, 'a', 'violetMurk');
    expect(getWallet(db, 'a').goal).toBe('obsidian');
    buyItem(db, 'a', 'obsidian');
    expect(getWallet(db, 'a').goal).toBeNull();
    expect(pinGoal(db, 'a', null)).toEqual({ ok: true });
    db.close();
  });

  it('only pins things that are real, for sale and not yet owned', () => {
    const { db } = open(100);
    buyItem(db, 'a', 'violetMurk');
    expect(pinGoal(db, 'a', 'violetMurk')).toEqual(fail('ALREADY_OWNED'));
    expect(pinGoal(db, 'a', 'bone', comingSoon)).toEqual(fail('NOT_AVAILABLE'));
    expect(pinGoal(db, 'a', 'nope')).toEqual(fail('UNKNOWN_ITEM'));
    expect(getWallet(db, 'a').goal).toBeNull();
    db.close();
  });

  it('describes a whole account, and an empty one', () => {
    const { db } = open(100);
    buyItem(db, 'a', 'violetMurk');
    pinGoal(db, 'a', 'obsidian');
    expect(getWallet(db, 'a')).toEqual({
      balance: 60,
      owned: ['violetMurk'],
      equipped: {},
      goal: 'obsidian',
    });
    expect(getWallet(db, 'nobody')).toEqual({ balance: 0, owned: [], equipped: {}, goal: null });
    db.close();
  });

  it('keeps purchases, equipment and goals across a restart', () => {
    const { dir, db } = open(100);
    buyItem(db, 'a', 'violetMurk');
    db.prepare("INSERT INTO inventory VALUES ('a', 'swamp', 40, 'now')").run();
    equipItem(db, 'a', 'brew', 'swamp');
    pinGoal(db, 'a', 'obsidian');
    db.close();
    const again = openDatabase(dir);
    expect(getWallet(again, 'a')).toEqual({
      balance: 60,
      owned: expect.arrayContaining(['violetMurk', 'swamp']),
      equipped: { brew: 'swamp' },
      goal: 'obsidian',
    });
    again.close();
  });

  it('cannot overspend across two connections to one file', () => {
    // Two connections to one file, as during a deploy overlap; each purchase re-reads the balance.
    const { dir, db } = open(40);
    const other = openDatabase(dir);
    const results = [buyItem(db, 'a', 'violetMurk'), buyItem(other, 'a', 'obsidian')];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(getBalance(db, 'a')).toBe(0);
    other.close();
    db.close();
  });
});
