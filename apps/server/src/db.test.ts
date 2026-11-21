import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { awardCoins, coinsOf, openDatabase, openMemoryDatabase, recordBoot } from './db';

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

  it('pays a game once per player and keeps a running balance', () => {
    const db = openMemoryDatabase();
    const award = { userId: 'u1', name: 'Madi', delta: 40, reason: 'game', gameId: 'g1' };
    expect(coinsOf(db, 'u1')).toBe(0);
    expect(awardCoins(db, award)).toBe(40);
    expect(awardCoins(db, award)).toBeNull();
    expect(awardCoins(db, { ...award, gameId: 'g2', delta: 25 })).toBe(65);
    expect(awardCoins(db, { ...award, userId: 'u2', name: 'Mom' })).toBe(40);
    expect(coinsOf(db, 'u1')).toBe(65);
    const ledger = db.prepare('SELECT COUNT(*) AS n FROM ledger').get() as { n: number };
    expect(ledger.n).toBe(3);
    db.close();
  });
});
