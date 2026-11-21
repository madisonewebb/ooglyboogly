import { describe, expect, it } from 'vitest';
import {
  activePlayers,
  applyMove,
  createGame,
  isPlayerDone,
  replay,
  tryMove,
  validateSetup,
} from './engine';
import { card, d, newGame, setup, withCard } from './test-helpers';
import {
  BOXES,
  type Box,
  type Die,
  type GameState,
  type Move,
  RuleError,
  type RuleErrorCode,
} from './types';

const play = (state: GameState, ...moves: Move[]) => moves.reduce(applyMove, state);
const roll = (player: number, faces: string): Move => ({ type: 'roll', player, values: d(faces) });
const score = (player: number, box: Box, cardIndex = 0): Move => ({
  type: 'score',
  player,
  card: cardIndex,
  box,
});
const hold = (player: number, die: number, held = true): Move => ({
  type: 'hold',
  player,
  die,
  held,
});
const undo = (player: number): Move => ({ type: 'undo', player });

function expectError(state: GameState, move: Move, code: RuleErrorCode) {
  const result = tryMove(state, move);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
}

describe('setup', () => {
  it('creates empty cards for every player', () => {
    const g = createGame(setup({ players: 3, cardsPerPlayer: 5 }));
    expect(g.players).toHaveLength(3);
    expect(g.players.every((p) => p.cards.length === 5)).toBe(true);
    expect(g.finished).toBe(false);
  });

  it.each([
    [{ players: 0 }],
    [{ players: 9 }],
    [{ players: 1.5 }],
    [{ cardsPerPlayer: 0 }],
    [{ cardsPerPlayer: 6 }],
    [{ playStyle: 'race' as never }],
    [{ multipliers: 'yes' as never }],
    [{ players: 2, turnOrder: [0] }],
    [{ players: 2, turnOrder: [0, 0] }],
    [{ players: 2, turnOrder: [1, 2] }],
    [{ players: 2, turnOrder: 'ab' as never }],
  ])('rejects %j', (over) => {
    expect(() => validateSetup(setup(over))).toThrow(RuleError);
  });

  it('accepts 1 to 8 players and 1 to 5 cards', () => {
    for (const players of [1, 8]) {
      for (const cardsPerPlayer of [1, 5]) {
        expect(() => validateSetup(setup({ players, cardsPerPlayer }))).not.toThrow();
      }
    }
  });

  it('does not share the turn order array with the caller', () => {
    const order = [1, 0];
    const g = createGame(setup({ players: 2, turnOrder: order }));
    order[0] = 0;
    expect(g.setup.turnOrder).toEqual([1, 0]);
  });
});

describe('rolling and holding', () => {
  it('rolls all five dice first, then only the free ones', () => {
    let g = play(newGame(), roll(0, '12345'), hold(0, 0), hold(0, 4));
    g = play(g, roll(0, '666'));
    expect(g.players[0]!.turn.dice).toEqual(d('16665'));
    expect(g.players[0]!.turn.rolls).toBe(2);
  });

  it('lets a held die be released', () => {
    const g = play(newGame(), roll(0, '12345'), hold(0, 2), hold(0, 2, false), roll(0, '66666'));
    expect(g.players[0]!.turn.dice).toEqual(d('66666'));
  });

  it('allows three rolls a turn', () => {
    const g = play(newGame(), roll(0, '11111'), roll(0, '22222'), roll(0, '33333'));
    expectError(g, roll(0, '44444'), 'NO_ROLLS_LEFT');
    expectError(g, hold(0, 1), 'NO_ROLLS_LEFT');
  });

  it('needs one value per free die, each 1 to 6', () => {
    const g = play(newGame(), roll(0, '12345'), hold(0, 0));
    expectError(g, roll(0, '12345'), 'BAD_VALUES');
    expectError(g, roll(0, '123'), 'BAD_VALUES');
    expectError(g, { type: 'roll', player: 0, values: [0, 1, 2, 3] as Die[] }, 'BAD_VALUES');
    expectError(g, { type: 'roll', player: 0, values: [7, 1, 2, 3] as Die[] }, 'BAD_VALUES');
    expectError(g, { type: 'roll', player: 0, values: [1.5, 1, 2, 3] as Die[] }, 'BAD_VALUES');
    expectError(g, { type: 'roll', player: 0, values: 'abcd' as never }, 'BAD_VALUES');
  });

  it('refuses a roll with every die held', () => {
    const g = play(newGame(), roll(0, '12345'), ...[0, 1, 2, 3, 4].map((i) => hold(0, i)));
    expectError(g, roll(0, ''), 'ALL_HELD');
  });

  it('only holds after a roll, and only real dice', () => {
    expectError(newGame(), hold(0, 0), 'MUST_ROLL_FIRST');
    const g = play(newGame(), roll(0, '12345'));
    expectError(g, hold(0, 5), 'BAD_DIE');
    expectError(g, hold(0, -1), 'BAD_DIE');
    expectError(g, { type: 'hold', player: 0, die: 0, held: 'yes' as never }, 'BAD_DIE');
  });

  it('starts each turn with fresh dice and no holds', () => {
    const g = play(newGame(), roll(0, '12345'), hold(0, 0), score(0, 'chance'));
    expect(g.players[0]!.turn).toEqual({
      dice: null,
      held: [false, false, false, false, false],
      rolls: 0,
    });
  });
});

describe('scoring', () => {
  it('writes the roll into one box on the chosen card', () => {
    const g = play(newGame({ cardsPerPlayer: 3 }), roll(0, '33322'), score(0, 'fullHouse', 2));
    expect(g.players[0]!.cards[2]!.boxes).toEqual({ fullHouse: 25 });
    expect(g.players[0]!.cards[0]!.boxes).toEqual({});
  });

  it('can write a 0', () => {
    const g = play(newGame(), roll(0, '12346'), score(0, 'largeStraight'));
    expect(g.players[0]!.cards[0]!.boxes.largeStraight).toBe(0);
  });

  it('rejects scoring before rolling, bad cards, bad boxes and filled boxes', () => {
    expectError(newGame(), score(0, 'chance'), 'MUST_ROLL_FIRST');
    const g = play(newGame({ cardsPerPlayer: 2 }), roll(0, '12345'));
    expectError(g, score(0, 'chance', 2), 'BAD_CARD');
    expectError(g, score(0, 'chance', -1), 'BAD_CARD');
    expectError(g, score(0, 'bogus' as Box), 'BAD_BOX');
    const filled = withCard(g, 0, 1, card({ chance: 20 }));
    expectError(filled, score(0, 'chance', 1), 'BOX_FILLED');
  });

  it('enforces the joker order', () => {
    const g = withCard(play(newGame(), roll(0, '44444')), 0, 0, card({ yatzy: 50 }));
    expectError(g, score(0, 'chance'), 'JOKER_FORCED');
    const next = applyMove(g, score(0, 'fours'));
    expect(next.players[0]!.cards[0]).toEqual({
      boxes: { yatzy: 50, fours: 20 },
      yatzyBonuses: 1,
    });
  });

  it('awards the bonus per card: a 50 on card 1 earns nothing on card 2', () => {
    let g = play(newGame({ cardsPerPlayer: 2 }), roll(0, '55555'), score(0, 'yatzy', 0));
    g = play(g, roll(0, '55555'), score(0, 'yatzy', 1));
    expect(g.players[0]!.cards[1]).toEqual({ boxes: { yatzy: 50 }, yatzyBonuses: 0 });
    g = play(g, roll(0, '55555'), score(0, 'fives', 0));
    expect(g.players[0]!.cards[0]!.yatzyBonuses).toBe(1);
  });

  it('keeps adding bonuses past three on a card', () => {
    let g = play(newGame(), roll(0, '55555'), score(0, 'yatzy'));
    for (const box of ['fives', 'chance', 'fullHouse', 'smallStraight'] as const) {
      g = play(g, roll(0, '55555'), score(0, box));
    }
    expect(g.players[0]!.cards[0]!.yatzyBonuses).toBe(4);
    expect(g.players[0]!.cards[0]!.boxes).toMatchObject({
      chance: 25,
      fullHouse: 25,
      smallStraight: 30,
    });
  });

  it('applies the joker without a bonus when the card’s box holds 0', () => {
    let g = play(newGame(), roll(0, '12346'), score(0, 'yatzy'));
    g = play(g, roll(0, '22222'));
    expectError(g, score(0, 'chance'), 'JOKER_FORCED');
    g = applyMove(g, score(0, 'twos'));
    expect(g.players[0]!.cards[0]).toEqual({
      boxes: { yatzy: 0, twos: 10 },
      yatzyBonuses: 0,
    });
  });
});

describe('take turns', () => {
  const game = () => newGame({ players: 3, turnOrder: [2, 0, 1] });

  it('follows the turn order and wraps around', () => {
    let g = game();
    expect(activePlayers(g)).toEqual([2]);
    expectError(g, roll(0, '12345'), 'NOT_YOUR_TURN');
    g = play(g, roll(2, '12345'), score(2, 'chance'));
    expect(activePlayers(g)).toEqual([0]);
    g = play(g, roll(0, '12345'), score(0, 'chance'), roll(1, '12345'), score(1, 'chance'));
    expect(activePlayers(g)).toEqual([2]);
  });

  it('lets the scorer undo until the next player rolls', () => {
    const before = play(game(), roll(2, '33322'), hold(2, 0));
    const scored = applyMove(before, score(2, 'fullHouse'));
    expect(activePlayers(scored)).toEqual([0]);
    expectError(scored, undo(0), 'NOTHING_TO_UNDO'); // not seat 0's score
    const undone = applyMove(scored, undo(2));
    expect(undone).toEqual(before);
    expect(activePlayers(undone)).toEqual([2]);

    const rolled = applyMove(scored, roll(0, '12345'));
    expectError(rolled, undo(2), 'NOTHING_TO_UNDO');
  });

  it('can undo, rescore elsewhere, and undo again', () => {
    let g = play(game(), roll(2, '33322'), score(2, 'fullHouse'), undo(2));
    g = play(g, score(2, 'threes'));
    expect(g.players[2]!.cards[0]!.boxes).toEqual({ threes: 9 });
    g = applyMove(g, undo(2));
    expect(g.players[2]!.cards[0]!.boxes).toEqual({});
    expectError(g, undo(2), 'NOTHING_TO_UNDO');
  });

  it('takes the bonus back on undo', () => {
    const base = withCard(play(game(), roll(2, '66666')), 2, 0, card({ yatzy: 50 }));
    const g = play(base, score(2, 'sixes'), undo(2));
    expect(g).toEqual(base);
  });
});

describe('everyone at once', () => {
  const game = () => newGame({ players: 2, playStyle: 'together' });

  it('lets every player act at their own pace', () => {
    let g = game();
    expect(activePlayers(g)).toEqual([0, 1]);
    g = play(g, roll(1, '12345'), roll(0, '66666'), score(0, 'yatzy'), roll(0, '11111'));
    expect(g.players[1]!.turn.rolls).toBe(1);
    expect(g.players[0]!.turn.rolls).toBe(1);
  });

  it('keeps your undo open while others roll, and closes it on your own roll', () => {
    const before = play(game(), roll(0, '12345'));
    let g = play(before, score(0, 'largeStraight'), roll(1, '22222'));
    const undone = applyMove(g, undo(0));
    expect(undone.players[0]).toEqual(before.players[0]);
    g = applyMove(g, roll(0, '12345'));
    expectError(g, undo(0), 'NOTHING_TO_UNDO');
  });

  it('stops a finished player but lets the others carry on', () => {
    const full = Object.fromEntries(BOXES.filter((b) => b !== 'chance').map((b) => [b, 0]));
    let g = withCard(game(), 0, 0, card(full));
    g = withCard(g, 1, 0, card(full));
    g = play(g, roll(0, '12345'), score(0, 'chance'));
    expect(isPlayerDone(g, 0)).toBe(true);
    expect(activePlayers(g)).toEqual([1]);
    expectError(g, roll(0, '12345'), 'PLAYER_DONE');
    g = play(g, roll(1, '12345'), score(1, 'chance'));
    expect(g.finished).toBe(true);
  });
});

describe('game over', () => {
  it('ends when every box on every card is filled, and refuses further moves', () => {
    let g = newGame();
    for (const box of BOXES) g = play(g, roll(0, '12346'), score(0, box));
    expect(g.finished).toBe(true);
    expect(activePlayers(g)).toEqual([]);
    expectError(g, roll(0, '12345'), 'GAME_OVER');
    expectError(g, undo(0), 'GAME_OVER');
  });
});

describe('moves in general', () => {
  it('rejects unknown seats and unknown move types', () => {
    expectError(newGame(), roll(1, '12345'), 'BAD_PLAYER');
    expectError(newGame(), roll(-1, '12345'), 'BAD_PLAYER');
    expectError(newGame(), { type: 'cheat', player: 0 } as never, 'BAD_MOVE');
  });

  it('never mutates the state it is given', () => {
    const g = play(newGame({ players: 2 }), roll(0, '12345'));
    const snapshot = JSON.parse(JSON.stringify(g)) as GameState;
    applyMove(g, hold(0, 1));
    applyMove(g, score(0, 'chance'));
    expect(g).toEqual(snapshot);
  });

  it('rethrows errors that are not rule errors', () => {
    const broken = { ...newGame(), players: null } as unknown as GameState;
    expect(() => tryMove(broken, roll(0, '12345'))).toThrow(TypeError);
  });

  it('rebuilds the same state from the move list', () => {
    const s = setup({ players: 2, cardsPerPlayer: 2, turnOrder: [1, 0] });
    const moves: Move[] = [roll(1, '12345'), hold(1, 0), roll(1, '6543'), score(1, 'chance', 1)];
    const live = moves.reduce(applyMove, createGame(s));
    expect(replay(s, moves)).toEqual(live);
  });
});
