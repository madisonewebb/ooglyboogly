/** A die face, 1 to 6. */
export type Die = 1 | 2 | 3 | 4 | 5 | 6;

export const DICE_PER_ROLL = 5;
export const FACES = 6;
export const ROLLS_PER_TURN = 3;

export const UPPER_BOXES = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const;
export const LOWER_BOXES = [
  'threeKind',
  'fourKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'fiveKind',
  'chance',
] as const;
export const BOXES = [...UPPER_BOXES, ...LOWER_BOXES] as const;

export type UpperBox = (typeof UPPER_BOXES)[number];
export type LowerBox = (typeof LOWER_BOXES)[number];
export type Box = (typeof BOXES)[number];

export const UPPER_BONUS = 35;
export const UPPER_BONUS_THRESHOLD = 63;
export const FULL_HOUSE = 25;
export const SMALL_STRAIGHT = 30;
export const LARGE_STRAIGHT = 40;
export const FIVE_KIND = 50;
export const FIVE_KIND_BONUS = 100;

export const MIN_CARDS = 1;
export const MAX_CARDS = 5;
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 8;

/** Take turns, or everyone at once (which also covers multi-day games). */
export type PlayStyle = 'turns' | 'together';

export interface GameSetup {
  /** Seats at the table, 1 to 8. Moves refer to players by seat index. */
  players: number;
  /** Scorecards per player, 1 to 5, the same for everyone. */
  cardsPerPlayer: number;
  playStyle: PlayStyle;
  /** Classic multipliers: card n's total counts n times. */
  multipliers: boolean;
  /**
   * Seat order for Take turns, a permutation of 0..players-1. The server
   * decides it (fixed, or shuffled at start) and records it here. Ignored in
   * Everyone at once.
   */
  turnOrder: readonly number[];
}

/** A roll records only the new values, one per free (unheld) die, left to right. */
export interface RollMove {
  type: 'roll';
  player: number;
  values: readonly Die[];
}

export interface HoldMove {
  type: 'hold';
  player: number;
  die: number;
  held: boolean;
}

export interface ScoreMove {
  type: 'score';
  player: number;
  card: number;
  box: Box;
}

/** Takes back the player's last score, until the next roll closes the window. */
export interface UndoMove {
  type: 'undo';
  player: number;
}

export type Move = RollMove | HoldMove | ScoreMove | UndoMove;

export interface Card {
  /** Filled boxes and the points written in them. */
  readonly boxes: Readonly<Partial<Record<Box, number>>>;
  /** Extra Five of a Kinds written on this card while its box held 50. */
  readonly fiveKindBonuses: number;
}

export interface Turn {
  /** Null until the first roll of the turn. */
  readonly dice: readonly Die[] | null;
  readonly held: readonly boolean[];
  readonly rolls: number;
}

/** What an undo needs to put back. */
export interface UndoRecord {
  readonly card: number;
  readonly box: Box;
  readonly bonus: boolean;
  readonly turn: Turn;
  readonly pointer: number;
}

export interface PlayerState {
  readonly cards: readonly Card[];
  readonly turn: Turn;
  readonly lastScore: UndoRecord | null;
}

export interface GameState {
  readonly setup: GameSetup;
  readonly players: readonly PlayerState[];
  /** Index into setup.turnOrder of whoever is up (Take turns only). */
  readonly pointer: number;
  readonly finished: boolean;
}

export type RuleErrorCode =
  | 'BAD_SETUP'
  | 'BAD_MOVE'
  | 'BAD_PLAYER'
  | 'GAME_OVER'
  | 'NOT_YOUR_TURN'
  | 'PLAYER_DONE'
  | 'NO_ROLLS_LEFT'
  | 'ALL_HELD'
  | 'BAD_VALUES'
  | 'MUST_ROLL_FIRST'
  | 'BAD_DIE'
  | 'BAD_CARD'
  | 'BAD_BOX'
  | 'BOX_FILLED'
  | 'JOKER_FORCED'
  | 'NOTHING_TO_UNDO';

export class RuleError extends Error {
  readonly code: RuleErrorCode;
  constructor(code: RuleErrorCode, message: string) {
    super(message);
    this.name = 'RuleError';
    this.code = code;
  }
}
