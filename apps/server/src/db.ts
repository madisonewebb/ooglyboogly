import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { PayoutBreakdown } from '@rollhouse/rules';
import {
  type Equipped,
  fitsSlot,
  isSlot,
  type ShopEntry,
  type ShopErrorCode,
  shopEntry,
  type Slot,
  SLOTS,
  type WalletMessage,
} from '@rollhouse/shared';

/**
 * The game database: a boot log, the coins players earn, and what they spend them on.
 * (The coin tables are `wallets` and `payouts`; the shop's are `inventory`, `equipped`
 * and `goals`. An earlier, reverted version of coins left a `players`
 * table with other columns in some databases, so that name must not be reused.) The payouts table
 * is the record of every coin paid; a player's balance is the running sum of it
 * minus what they spend (an `inventory` row records each purchase and its price). Drizzle arrives later.
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
    CREATE TABLE IF NOT EXISTS wallets (
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
    -- Everything a player bought, cosmetics and sticker packs alike. One row per
    -- (player, item): the key is what makes a repeated purchase impossible.
    CREATE TABLE IF NOT EXISTS inventory (
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      price_paid INTEGER NOT NULL CHECK (price_paid >= 0),
      purchased_at TEXT NOT NULL,
      PRIMARY KEY (user_id, item_id)
    );
    -- What a player has on: at most one item per slot. No row means the default look.
    CREATE TABLE IF NOT EXISTS equipped (
      user_id TEXT NOT NULL,
      slot TEXT NOT NULL,
      item_id TEXT NOT NULL,
      PRIMARY KEY (user_id, slot)
    );
    -- The item a player is saving up for. Server-side, so it follows them across devices.
    CREATE TABLE IF NOT EXISTS goals (
      user_id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    `INSERT INTO wallets (user_id, coins, created_at, updated_at) VALUES (?, ?, ?, ?)
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
  const row = db.prepare('SELECT coins FROM wallets WHERE user_id = ?').get(userId) as
    { coins: number } | undefined;
  return row?.coins ?? 0;
}

/* ---------- The shop ---------- */

/** What a shop action did: it worked, or the reason it did not (changing nothing). */
export type ShopResult =
  { ok: true } | { ok: false; code: ShopErrorCode | 'BAD_INTENT'; message: string };

const OK: ShopResult = { ok: true };
const no = (code: Extract<ShopResult, { ok: false }>['code'], message: string): ShopResult => ({
  ok: false,
  code,
  message,
});

/** Runs `work` in one transaction: it commits when the work succeeds and rolls back otherwise. */
function inTransaction(db: DatabaseSync, work: () => ShopResult): ShopResult {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec(result.ok ? 'COMMIT' : 'ROLLBACK');
    return result;
  } catch (err) {
    // SQLite may already have rolled back on its own.
    if (db.isTransaction) db.exec('ROLLBACK');
    throw err;
  }
}

/** True when the player has bought this item or pack. */
export const ownsItem = (db: DatabaseSync, userId: string, itemId: string): boolean =>
  db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(userId, itemId) !==
  undefined;

/**
 * Buys one item: takes its price off the balance and adds it to the inventory,
 * in one transaction. The price comes from the catalog (`lookup`), never from the
 * caller. Buying what is already owned is refused before any coin moves, so a
 * retry or a double tap can never charge twice. `lookup` is only replaced in tests.
 */
export function buyItem(
  db: DatabaseSync,
  userId: string,
  itemId: unknown,
  lookup: (id: unknown) => ShopEntry | undefined = shopEntry,
): ShopResult {
  const entry = lookup(itemId);
  if (!entry) return no('UNKNOWN_ITEM', 'there is no such item');
  if (!entry.available) return no('NOT_AVAILABLE', `${entry.name} is coming soon`);
  return inTransaction(db, () => {
    if (ownsItem(db, userId, entry.id)) {
      return no('ALREADY_OWNED', `you already have ${entry.name}`);
    }
    const now = new Date().toISOString();
    // The guard in the WHERE clause is what stops the balance going negative.
    const { changes } = db
      .prepare(
        'UPDATE wallets SET coins = coins - ?, updated_at = ? WHERE user_id = ? AND coins >= ?',
      )
      .run(entry.price, now, userId, entry.price);
    if (Number(changes) === 0) {
      return no('NOT_ENOUGH_COINS', `${entry.name} costs ${entry.price} coins`);
    }
    db.prepare(
      'INSERT INTO inventory (user_id, item_id, price_paid, purchased_at) VALUES (?, ?, ?, ?)',
    ).run(userId, entry.id, entry.price, now);
    // Bought what you were saving for: the goal is done.
    db.prepare('DELETE FROM goals WHERE user_id = ? AND item_id = ?').run(userId, entry.id);
    return OK;
  });
}

/**
 * Puts an owned item on in its slot, or (item null) takes the slot's item off.
 * The item must be a real catalog item that belongs in that slot, and owned.
 */
export function equipItem(
  db: DatabaseSync,
  userId: string,
  slot: unknown,
  itemId: unknown,
): ShopResult {
  if (!isSlot(slot)) return no('BAD_INTENT', 'pick a slot');
  if (itemId === null) {
    db.prepare('DELETE FROM equipped WHERE user_id = ? AND slot = ?').run(userId, slot);
    return OK;
  }
  if (!fitsSlot(slot, itemId)) return no('UNKNOWN_ITEM', 'that does not go there');
  return inTransaction(db, () => {
    if (!ownsItem(db, userId, itemId)) return no('NOT_OWNED', 'you do not have that yet');
    db.prepare(
      `INSERT INTO equipped (user_id, slot, item_id) VALUES (?, ?, ?)
       ON CONFLICT (user_id, slot) DO UPDATE SET item_id = excluded.item_id`,
    ).run(userId, slot, itemId);
    return OK;
  });
}

/** Pins the item a player is saving for (or clears it with null). Only something still to buy. */
export function pinGoal(db: DatabaseSync, userId: string, itemId: unknown): ShopResult {
  if (itemId === null) {
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    return OK;
  }
  const entry = shopEntry(itemId);
  if (!entry) return no('UNKNOWN_ITEM', 'there is no such item');
  if (!entry.available) return no('NOT_AVAILABLE', `${entry.name} is coming soon`);
  return inTransaction(db, () => {
    if (ownsItem(db, userId, entry.id)) {
      return no('ALREADY_OWNED', `you already have ${entry.name}`);
    }
    db.prepare(
      `INSERT INTO goals (user_id, item_id, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET item_id = excluded.item_id,
                                           updated_at = excluded.updated_at`,
    ).run(userId, entry.id, new Date().toISOString());
    return OK;
  });
}

/** What a player has on. Rows for items that left the catalog are ignored. */
export function getEquipped(db: DatabaseSync, userId: string): Equipped {
  const rows = db.prepare('SELECT slot, item_id FROM equipped WHERE user_id = ?').all(userId) as {
    slot: string;
    item_id: string;
  }[];
  const out: Equipped = {};
  for (const slot of SLOTS) {
    const row = rows.find((r) => r.slot === slot);
    if (row && fitsSlot(slot as Slot, row.item_id)) out[slot] = row.item_id;
  }
  return out;
}

/** Everything one player sees of their own account, minus whether they may spend. */
export function getWallet(db: DatabaseSync, userId: string): Omit<WalletMessage, 'canBuy'> {
  const owned = (
    db
      .prepare('SELECT item_id FROM inventory WHERE user_id = ? ORDER BY purchased_at, item_id')
      .all(userId) as { item_id: string }[]
  ).map((r) => r.item_id);
  const goal = db.prepare('SELECT item_id FROM goals WHERE user_id = ?').get(userId) as
    { item_id: string } | undefined;
  return {
    balance: getBalance(db, userId),
    owned,
    equipped: getEquipped(db, userId),
    goal: goal?.item_id ?? null,
  };
}
