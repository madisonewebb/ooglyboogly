import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * The game database. For now it holds only a boot log, so Litestream has real
 * data to replicate and restore. Drizzle and the game tables arrive in M5.
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
