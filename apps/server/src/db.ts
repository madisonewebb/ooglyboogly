import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { PayoutBreakdown } from '@rollhouse/rules';

/**
 * The game database: a boot log, and the coins players earn. The payouts table
 * is the record of every coin paid; a player's balance is the running sum of it
 * (and, once there is a shop, minus what they spend). Drizzle arrives later.
 */
export function openDatabase(dataDir: string): DatabaseSync {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'rollhouse.db'));
  // WAL is required by Litestream; busy_timeout covers its brief checkpoint locks.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS boots (
      id INTEGER PRIMARY KEY,
      sha TEXT NOT NULL,
      version TEXT NOT NULL,
      started_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS players (
      user_id TEXT PRIMARY KEY,
      coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payouts (
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      coins INTEGER NOT NULL CHECK (coins >= 0),
      breakdown TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (game_id, user_id)
    );
  `);
  return db;
}

export function recordBoot(db: DatabaseSync, sha: string, version: string): number {
  db.prepare('INSERT INTO boots (sha, version, started_at) VALUES (?, ?, ?)').run(
    sha,
    version,
    new Date().toISOString(),
  );
  const row = db.prepare('SELECT COUNT(*) AS n FROM boots').get() as { n: number };
  return row.n;
}

/** One player's payout from one game. */
export interface PayoutRow {
  userId: string;
  coins: number;
  breakdown: PayoutBreakdown;
}

/**
 * Pays a finished game: one row per player and their coins added to their
 * balance, all in one transaction. A (game, player) pair is paid at most once,
 * so calling this again for the same game changes nothing. Returns whether
 * anything was paid.
 */
export function payOut(db: DatabaseSync, gameId: string, rows: readonly PayoutRow[]): boolean {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO payouts (game_id, user_id, coins, breakdown, created_at)
     VALUES (?, ?, ?, ?, ?) ON CONFLICT (game_id, user_id) DO NOTHING`,
  );
  const credit = db.prepare(
    `INSERT INTO players (user_id, coins, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET coins = coins + excluded.coins,
                                         updated_at = excluded.updated_at`,
  );
  let paid = false;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of rows) {
      const { changes } = insert.run(gameId, r.userId, r.coins, JSON.stringify(r.breakdown), now);
      if (Number(changes) === 0) continue;
      credit.run(r.userId, r.coins, now, now);
      paid = true;
    }
    db.exec('COMMIT');
  } catch (err) {
    // SQLite may already have rolled back on its own.
    if (db.isTransaction) db.exec('ROLLBACK');
    throw err;
  }
  return paid;
}

/** A player's coins; 0 for someone who has never earned any. */
export function getBalance(db: DatabaseSync, userId: string): number {
  const row = db.prepare('SELECT coins FROM players WHERE user_id = ?').get(userId) as
    { coins: number } | undefined;
  return row?.coins ?? 0;
}
