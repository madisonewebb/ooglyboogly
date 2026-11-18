import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, recordBoot } from './db';

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
