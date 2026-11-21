import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * The game database: a boot log, and each player's coins for the aquarium
 * shop with a ledger of every change. Litestream replicates it to the NAS.
 */
export function openDatabase(dataDir: string): DatabaseSync {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'rollhouse.db'));
  // WAL is required by Litestream; busy_timeout covers its brief checkpoint locks.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
  `);
  migrate(db);
  return db;
}

/** A throwaway database for tests. */
export function openMemoryDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boots (
      id INTEGER PRIMARY KEY,
      sha TEXT NOT NULL,
      version TEXT NOT NULL,
      started_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS players (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coins INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    -- Every change to a balance. A game pays each player once: the unique key
    -- makes a repeat payout (a retry, a restart) a no-op.
    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY,
      user_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      game_id TEXT,
      at TEXT NOT NULL,
      UNIQUE (user_id, game_id, reason)
    );
  `);
}

export interface Award {
  userId: string;
  /** Kept up to date, so the table reads well when browsing the database. */
  name: string;
  delta: number;
  reason: string;
  gameId: string;
}

/**
 * Adds coins to a player's balance, recording it in the ledger. Returns the
 * new balance, or null if this award was already paid.
 */
export function awardCoins(db: DatabaseSync, award: Award, now = new Date()): number | null {
  const at = now.toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const entry = db
      .prepare(
        'INSERT OR IGNORE INTO ledger (user_id, delta, reason, game_id, at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(award.userId, award.delta, award.reason, award.gameId, at);
    if (entry.changes === 0) {
      db.exec('ROLLBACK');
      return null;
    }
    db.prepare(
      `INSERT INTO players (user_id, name, coins, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET name = excluded.name,
         coins = coins + excluded.coins, updated_at = excluded.updated_at`,
    ).run(award.userId, award.name, award.delta, at);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return coinsOf(db, award.userId);
}

/** A player's balance; 0 for someone who has never been paid. */
export function coinsOf(db: DatabaseSync, userId: string): number {
  const row = db.prepare('SELECT coins FROM players WHERE user_id = ?').get(userId) as
    { coins: number } | undefined;
  return row?.coins ?? 0;
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
