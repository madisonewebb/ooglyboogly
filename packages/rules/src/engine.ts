import { cardOptions, isOpen } from './options';
import {
  BOXES,
  type Box,
  type Card,
  DICE_PER_ROLL,
  type Die,
  FACES,
  type GameSetup,
  type GameState,
  type HoldMove,
  MAX_CARDS,
  MAX_PLAYERS,
  MIN_CARDS,
  MIN_PLAYERS,
  type Move,
  type PlayerState,
  type RollMove,
  ROLLS_PER_TURN,
  RuleError,
  type ScoreMove,
  type Turn,
  type UndoMove,
} from './types';

/*
 * The rules engine is a pure reducer: a game is its setup plus the list of
 * moves, and state is rebuilt by replaying them. Nothing here is random. The
 * server rolls the dice and records them in roll moves.
 */

const freshTurn = (): Turn => ({
  dice: null,
  held: Array<boolean>(DICE_PER_ROLL).fill(false),
  rolls: 0,
});

const emptyCard = (): Card => ({ boxes: {}, fiveKindBonuses: 0 });

const isInt = (n: unknown, min: number, max: number): boolean =>
  typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;

function fail(code: RuleError['code'], message: string): never {
  throw new RuleError(code, message);
}

export function validateSetup(setup: GameSetup): void {
  if (!isInt(setup.players, MIN_PLAYERS, MAX_PLAYERS)) {
    fail('BAD_SETUP', `players must be ${MIN_PLAYERS} to ${MAX_PLAYERS}`);
  }
  if (!isInt(setup.cardsPerPlayer, MIN_CARDS, MAX_CARDS)) {
    fail('BAD_SETUP', `cardsPerPlayer must be ${MIN_CARDS} to ${MAX_CARDS}`);
  }
  if (setup.playStyle !== 'turns' && setup.playStyle !== 'together') {
    fail('BAD_SETUP', 'playStyle must be "turns" or "together"');
  }
  if (typeof setup.multipliers !== 'boolean') fail('BAD_SETUP', 'multipliers must be a boolean');
  const order = setup.turnOrder;
  const isPermutation =
    Array.isArray(order) &&
    order.length === setup.players &&
    [...order].sort((a, b) => a - b).every((seat, i) => seat === i);
  if (!isPermutation) fail('BAD_SETUP', 'turnOrder must list every seat exactly once');
}

export function createGame(setup: GameSetup): GameState {
  validateSetup(setup);
  const frozen: GameSetup = { ...setup, turnOrder: [...setup.turnOrder] };
  return {
    setup: frozen,
    players: Array.from({ length: setup.players }, () => ({
      cards: Array.from({ length: setup.cardsPerPlayer }, emptyCard),
      turn: freshTurn(),
      lastScore: null,
    })),
    pointer: 0,
    finished: false,
  };
}

export function isCardFull(card: Card): boolean {
  return BOXES.every((b) => !isOpen(card, b));
}

export function isPlayerDone(state: GameState, player: number): boolean {
  return state.players[player]!.cards.every(isCardFull);
}

/** Seats that may roll, hold or score right now. */
export function activePlayers(state: GameState): number[] {
  if (state.finished) return [];
  if (state.setup.playStyle === 'turns') return [state.setup.turnOrder[state.pointer]!];
  return state.players.map((_, p) => p).filter((p) => !isPlayerDone(state, p));
}

function withPlayer(state: GameState, player: number, next: PlayerState): GameState {
  return { ...state, players: state.players.map((p, i) => (i === player ? next : p)) };
}

function checkPlayer(state: GameState, player: number): PlayerState {
  if (!isInt(player, 0, state.players.length - 1)) fail('BAD_PLAYER', `no seat ${player}`);
  if (state.finished) fail('GAME_OVER', 'the game is over');
  return state.players[player]!;
}

/** Roll, hold and score need it to be your turn (Take turns) or you to have boxes left. */
function checkActing(state: GameState, player: number): PlayerState {
  const ps = checkPlayer(state, player);
  if (state.setup.playStyle === 'turns') {
    if (state.setup.turnOrder[state.pointer] !== player) {
      fail('NOT_YOUR_TURN', `it is seat ${state.setup.turnOrder[state.pointer]}'s turn`);
    }
  } else if (isPlayerDone(state, player)) {
    fail('PLAYER_DONE', 'every box on your cards is filled');
  }
  return ps;
}

function roll(state: GameState, move: RollMove): GameState {
  const ps = checkActing(state, move.player);
  const { turn } = ps;
  if (turn.rolls >= ROLLS_PER_TURN) fail('NO_ROLLS_LEFT', `only ${ROLLS_PER_TURN} rolls a turn`);
  const free = turn.held.flatMap((h, i) => (h ? [] : [i]));
  if (free.length === 0) fail('ALL_HELD', 'every die is held');
  const values = move.values;
  if (
    !Array.isArray(values) ||
    values.length !== free.length ||
    !values.every((v) => isInt(v, 1, FACES))
  ) {
    fail('BAD_VALUES', `expected ${free.length} dice from 1 to ${FACES}`);
  }
  const dice: Die[] = [...(turn.dice ?? Array<Die>(DICE_PER_ROLL).fill(1))];
  free.forEach((pos, i) => (dice[pos] = values[i]!));
  const next = withPlayer(state, move.player, {
    ...ps,
    turn: { ...turn, dice, rolls: turn.rolls + 1 },
  });
  // A roll closes undo windows: anyone's last score in Take turns (this is the
  // next player's roll), only your own in Everyone at once.
  return {
    ...next,
    players: next.players.map((p, i) =>
      state.setup.playStyle === 'turns' || i === move.player ? { ...p, lastScore: null } : p,
    ),
  };
}

function hold(state: GameState, move: HoldMove): GameState {
  const ps = checkActing(state, move.player);
  const { turn } = ps;
  if (turn.rolls === 0) fail('MUST_ROLL_FIRST', 'roll before holding dice');
  if (turn.rolls >= ROLLS_PER_TURN) fail('NO_ROLLS_LEFT', 'no rolls left to hold dice for');
  if (!isInt(move.die, 0, DICE_PER_ROLL - 1)) fail('BAD_DIE', `no die ${move.die}`);
  if (typeof move.held !== 'boolean') fail('BAD_DIE', 'held must be a boolean');
  const held = turn.held.map((h, i) => (i === move.die ? move.held : h));
  return withPlayer(state, move.player, { ...ps, turn: { ...turn, held } });
}

function score(state: GameState, move: ScoreMove): GameState {
  const ps = checkActing(state, move.player);
  const { turn } = ps;
  if (turn.dice === null) fail('MUST_ROLL_FIRST', 'roll before scoring');
  if (!isInt(move.card, 0, ps.cards.length - 1)) fail('BAD_CARD', `no card ${move.card}`);
  if (!(BOXES as readonly string[]).includes(move.box)) fail('BAD_BOX', `no box ${move.box}`);
  const card = ps.cards[move.card]!;
  if (!isOpen(card, move.box)) fail('BOX_FILLED', `${move.box} on card ${move.card + 1} is filled`);
  const { options, bonus } = cardOptions(card, turn.dice);
  const option = options.find((o) => o.box === move.box)!;
  if (!option.allowed) fail('JOKER_FORCED', 'the joker rules require a different box');

  const written: Card = {
    boxes: { ...card.boxes, [move.box]: option.value },
    fiveKindBonuses: card.fiveKindBonuses + (bonus ? 1 : 0),
  };
  const next = withPlayer(state, move.player, {
    cards: ps.cards.map((c, i) => (i === move.card ? written : c)),
    turn: freshTurn(),
    lastScore: { card: move.card, box: move.box, bonus, turn, pointer: state.pointer },
  });
  const pointer =
    state.setup.playStyle === 'turns' ? (state.pointer + 1) % state.setup.players : state.pointer;
  const finished = next.players.every((p) => p.cards.every(isCardFull));
  return { ...next, pointer, finished };
}

function undo(state: GameState, move: UndoMove): GameState {
  const ps = checkPlayer(state, move.player);
  const last = ps.lastScore;
  if (last === null) fail('NOTHING_TO_UNDO', 'no score to take back');
  const card = ps.cards[last.card]!;
  const boxes = Object.fromEntries(
    Object.entries(card.boxes).filter(([box]) => box !== last.box),
  ) as Partial<Record<Box, number>>;
  const restored: Card = { boxes, fiveKindBonuses: card.fiveKindBonuses - (last.bonus ? 1 : 0) };
  const next = withPlayer(state, move.player, {
    cards: ps.cards.map((c, i) => (i === last.card ? restored : c)),
    turn: last.turn,
    lastScore: null,
  });
  return { ...next, pointer: last.pointer };
}

/** Applies one move, or throws a RuleError. Never mutates its input. */
export function applyMove(state: GameState, move: Move): GameState {
  switch (move.type) {
    case 'roll':
      return roll(state, move);
    case 'hold':
      return hold(state, move);
    case 'score':
      return score(state, move);
    case 'undo':
      return undo(state, move);
    default:
      return fail('BAD_MOVE', `unknown move ${(move as { type: unknown }).type}`);
  }
}

export type MoveResult = { ok: true; state: GameState } | { ok: false; error: RuleError };

/** Like applyMove, but returns the error instead of throwing (for the server). */
export function tryMove(state: GameState, move: Move): MoveResult {
  try {
    return { ok: true, state: applyMove(state, move) };
  } catch (error) {
    if (error instanceof RuleError) return { ok: false, error };
    throw error;
  }
}

/** Rebuilds a game from its setup and move list. */
export function replay(setup: GameSetup, moves: readonly Move[]): GameState {
  return moves.reduce(applyMove, createGame(setup));
}
