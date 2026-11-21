import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBalance, openDatabase, payOut, recordBoot } from './db';

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
