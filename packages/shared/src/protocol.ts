import type { Box, GameSetup, Move, PlayStyle, RuleErrorCode } from '@rollhouse/rules';
import type { Equipped, Slot } from './catalog';
import type { PackStickerId } from './packs';
import type { PowerId, PowerStock } from './powers';
import type { TintId } from './tints';

/** Room and message names shared by the server, the web client and the smoke test. */
export const HELLO_ROOM = 'hello';

export const MSG_PING = 'ping';
export const MSG_PONG = 'pong';

export interface HealthResponse {
  status: 'ok';
  sha: string;
  version: string;
}

/* ---------- HTTP API ---------- */

/** GET /api/config: lets one image serve every environment. */
export interface AppConfig {
  /** Null when Discord sign-in isn't configured (local dev). */
  discordClientId: string | null;
  version: string;
  /** POST /api/guest is enabled (local dev and e2e only). */
  guestLogin: boolean;
}

/** Who a session belongs to. Guests have ids starting with "guest-". */
export interface SessionUser {
  id: string;
  name: string;
  /** Discord avatar hash, or null for the default avatar. */
  avatar: string | null;
}

/** POST /api/token body: the code from discordSdk.commands.authorize(). */
export interface TokenRequest {
  code: string;
}

export interface TokenResponse {
  /** Discord access token, for discordSdk.commands.authenticate(). */
  accessToken: string;
  /** Signed Rollhouse session, passed when joining a room. */
  session: string;
  user: SessionUser;
}

/** POST /api/guest body. */
export interface GuestRequest {
  name: string;
}

export interface GuestResponse {
  session: string;
  user: SessionUser;
}

export interface ApiError {
  error: string;
}

/* ---------- The table room ---------- */

/** One table per Discord Activity instance. */
export const TABLE_ROOM = 'table';

export interface JoinOptions {
  /** discordSdk.instanceId, or any shared string outside Discord. */
  instanceId: string;
  session: string;
  /** The tint this device remembers picking. */
  tint?: TintId;
}

export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 32;

export type TurnOrderMode = 'fixed' | 'random';

export interface LobbySettings {
  cardsPerPlayer: number;
  playStyle: PlayStyle;
  multipliers: boolean;
  /** Fixed is seat order; random shuffles once at start. */
  turnOrder: TurnOrderMode;
}

export const DEFAULT_SETTINGS: LobbySettings = {
  cardsPerPlayer: 3,
  playStyle: 'turns',
  multipliers: false,
  turnOrder: 'fixed',
};

export interface Seat {
  user: SessionUser;
  /** At least one of this user's devices is in the room. */
  connected: boolean;
  /** Unique at the table. */
  tint: TintId;
  /** What this player has on, shown to everyone at the table. Missing slots are the default look. */
  equipped?: Equipped;
}

export interface Lobby {
  /** Seat index = player index in the game. Fixed once the game starts. */
  seats: Seat[];
  /** User id of the host, who sets up and starts the game. */
  hostId: string;
  settings: LobbySettings;
  started: boolean;
  /** People watching: they arrived after the start, or every seat was taken. */
  spectators: SessionUser[];
}

/* Client → server intents. The server fills in the seat and rolls the dice. */
export const MSG_SETTINGS = 'settings';
export const MSG_START = 'start';
export const MSG_ROLL = 'roll';
export const MSG_HOLD = 'hold';
export const MSG_SCORE = 'score';
export const MSG_UNDO = 'undo';
export const MSG_TINT = 'tint';

export type SettingsIntent = Partial<LobbySettings>;
export interface HoldIntent {
  die: number;
  held: boolean;
}
/** Before the start. Picking a tint someone else has leaves yours as it was. */
export interface TintIntent {
  tint: TintId;
}
export interface ScoreIntent {
  card: number;
  box: Box;
}

/* Server → client messages. */
export const MSG_SNAPSHOT = 'snapshot';
export const MSG_LOBBY = 'lobby';
export const MSG_MOVE = 'move';
export const MSG_ERROR = 'error';

/** Sent on every join and rejoin. The client replays the moves with the rules engine. */
export interface Snapshot {
  lobby: Lobby;
  /** Null until the host starts the game. */
  setup: GameSetup | null;
  moves: Move[];
  /** Server version; a client built for another version reloads. */
  version: string;
  /** The user this connection belongs to. */
  you: SessionUser;
  /** Once the game has finished and been paid: what everyone earned. */
  payout?: PayoutMessage;
  /** The receiving player's own coins, items and goal. Never sent to anyone else. */
  wallet?: WalletMessage;
}

/** Each accepted move, in order. index = its position in the move log. */
export interface MoveMessage {
  index: number;
  move: Move;
  /**
   * Rolls only: picks which recorded tumble every screen plays. It is drawn
   * separately from the dice and never decides a result.
   */
  tumble?: number;
}

export type ErrorCode =
  | RuleErrorCode
  | 'NOT_HOST'
  | 'NOT_SEATED'
  | 'STARTED'
  | 'NOT_STARTED'
  | 'BAD_INTENT'
  | 'TOO_SOON'
  | ShopErrorCode;

export interface ErrorMessage {
  code: ErrorCode;
  message: string;
}

/* ---------- Coins ---------- */

/** Server → every client when a finished game has been paid. */
export const MSG_PAYOUT = 'payout';

/** What one seat earned, and why. Only seats that were actually paid are listed. */
export interface SeatPayoutInfo {
  userId: string;
  coins: number;
  finish: number;
  win: number;
  yatzy: number;
}

export interface PayoutMessage {
  seats: SeatPayoutInfo[];
  /** The receiving player's new coin total; null for someone who was not paid (watching). */
  balance: number | null;
}

/* ---------- The shop ---------- */

/** Why a shop message was refused. */
export type ShopErrorCode =
  | 'SHOP_CLOSED'
  | 'UNKNOWN_ITEM'
  | 'NOT_AVAILABLE'
  | 'ALREADY_OWNED'
  | 'NOT_ENOUGH_COINS'
  | 'NOT_OWNED'
  | 'NO_POWER';

/** Client → server: spend coins on an item or a sticker pack. The server prices it. */
export const MSG_BUY = 'buy';
export interface BuyIntent {
  item: string;
}

/** Client → server: buy one super power (any number of times). The server prices it. */
export const MSG_BUY_POWER = 'buyPower';
export interface BuyPowerIntent {
  power: PowerId;
}

/**
 * Client → server: spend one owned super power. `extraTurn` needs nothing more;
 * `unscratch` names the scratched box to reopen. Refused (and nothing spent)
 * unless the move is legal right now.
 */
export const MSG_USE_POWER = 'usePower';
export type UsePowerIntent =
  { power: 'extraTurn' } | { power: 'unscratch'; card: number; box: Box };

/** Client → server: wear an item (or take the slot's item off with `item: null`). Lobby only. */
export const MSG_EQUIP = 'equip';
export interface EquipIntent {
  slot: Slot;
  item: string | null;
}

/** Client → server: pin the item you are saving up for, or clear it with `item: null`. */
export const MSG_GOAL = 'goal';
export interface GoalIntent {
  item: string | null;
}

/** Server → one player (every device of theirs): their coins, items and goal. */
export const MSG_WALLET = 'wallet';
export interface WalletMessage {
  balance: number;
  /** Ids of everything bought: cosmetics and sticker packs. */
  owned: string[];
  equipped: Equipped;
  /** The pinned item, or null. */
  goal: string | null;
  /** Super powers in stock. A missing power means none. */
  powers: PowerStock;
  /** False where this player cannot spend (guests outside dev, or no database). */
  canBuy: boolean;
}

/* ---------- Reactions ---------- */

/**
 * Stickers anyone at the table can send during a game. Each one floats up
 * over the dice tray on every screen, with the sender's name.
 */
export const STICKER_IDS = [
  'cheering',
  'heart',
  'sunglasses',
  'sleeping',
  'babyYahtzee',
  'ooglyBoogly',
  'dontShitOnOnes',
  'steamingGarbage',
  'stressed',
] as const;
/** A sticker anyone may send, or one from a sticker pack the sender owns. */
export type StickerId = (typeof STICKER_IDS)[number] | PackStickerId;

/* `isSticker` lives in packs.ts: this file may only have type imports (see apps/server/src/protocolLoad.test.ts). */

/** Client → server: send a sticker. */
export const MSG_REACT = 'react';
export interface ReactIntent {
  sticker: StickerId;
}

/** Server → every client: someone sent a sticker. `id` counts up per table. */
export const MSG_REACTION = 'reaction';
export interface ReactionMessage {
  id: number;
  userId: string;
  sticker: StickerId;
}

/** One sticker per person this often, at most; extras are dropped quietly. */
export const REACTION_COOLDOWN_MS = 1200;

/* ---------- Nudges ---------- */

/**
 * A gentle poke for someone who is taking a while. Any seated player who is not
 * up can nudge whoever is. The server only allows it once that player has been
 * idle this long (since their turn began, or since their last move).
 */
export const NUDGE_AFTER_MS = 30_000;
/** One nudge per target, and one per sender, in this long. Extras are dropped quietly. */
export const NUDGE_COOLDOWN_MS = 20_000;

/** Client → server: nudge whoever is up. No payload. */
export const MSG_NUDGE = 'nudge';

/** Server → every client: `fromUserId` nudged `toUserId`. `id` counts up per table. */
export const MSG_NUDGED = 'nudged';
export interface NudgedMessage {
  id: number;
  fromUserId: string;
  toUserId: string;
}

/** Guest sessions (local dev and e2e only) have ids starting with "guest-". */
export const isGuestId = (id: string): boolean => id.startsWith('guest-');

/** Discord CDN avatar URL. Inside Discord, `cdnBase` is the /discord-cdn URL mapping. */
export function avatarUrl(user: SessionUser, cdnBase: string, size = 64): string | null {
  if (user.avatar === null || isGuestId(user.id)) return null;
  return `${cdnBase}/avatars/${user.id}/${user.avatar}.png?size=${size}`;
}
