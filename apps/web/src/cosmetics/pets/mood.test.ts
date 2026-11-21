import { describe, expect, it } from 'vitest';
import {
  applyMove,
  type Box,
  createGame,
  type Die,
  type GameSetup,
  type GameState,
  type Move,
} from '@rollhouse/rules';
import {
  type CelebrationMemo,
  celebrationStep,
  eventsBetween,
  isPetId,
  isYatzyEvent,
  PET_IDS,
  PET_POSES,
  type PetEvent,
  petMood,
  petOwner,
  poseFor,
  reactsTo,
} from './mood';

const setup = (over: Partial<GameSetup> = {}): GameSetup => ({
  players: 2,
  cardsPerPlayer: 1,
  playStyle: 'turns',
  multipliers: false,
  turnOrder: [0, 1],
  ...over,
});

const play = (s: GameSetup, moves: Move[]): GameState => moves.reduce(applyMove, createGame(s));
const roll = (player: number, ...values: Die[]): Move => ({ type: 'roll', player, values });
const score = (player: number, box: Box): Move => ({ type: 'score', player, card: 0, box });
const last = (g: GameState, m: Move) => eventsBetween(g, applyMove(g, m));

const rolled = (dice: Die[], rollNumber = 1): PetEvent => ({
  kind: 'roll',
  player: 0,
  dice,
  rollNumber,
});
const scored = (box: Box, value: number, yatzyBonus = false): PetEvent => ({
  kind: 'score',
  player: 0,
  box,
  value,
  yatzyBonus,
});

describe('eventsBetween', () => {
  const start = createGame(setup());

  it('reads a roll off the state change, with the dice and the roll number', () => {
    expect(last(start, roll(0, 1, 2, 3, 4, 5))).toEqual([
      { kind: 'roll', player: 0, dice: [1, 2, 3, 4, 5], rollNumber: 1 },
    ]);
  });

  it('reads a score, with its value', () => {
    const g = play(setup(), [roll(0, 6, 6, 6, 6, 1)]);
    expect(last(g, score(0, 'sixes'))).toEqual([
      { kind: 'score', player: 0, box: 'sixes', value: 24, yatzyBonus: false },
    ]);
  });

  it('reads a zero as a score of 0', () => {
    const g = play(setup(), [roll(0, 1, 2, 3, 4, 6)]);
    expect(last(g, score(0, 'yatzy'))).toMatchObject([{ kind: 'score', box: 'yatzy', value: 0 }]);
  });

  it('reads an extra Yatzy as a bonus', () => {
    const g = play(setup({ players: 1, turnOrder: [0] }), [
      roll(0, 3, 3, 3, 3, 3),
      score(0, 'yatzy'),
      roll(0, 2, 2, 2, 2, 2),
    ]);
    expect(last(g, score(0, 'twos'))).toMatchObject([{ kind: 'score', yatzyBonus: true }]);
  });

  it('reads an undo', () => {
    const g = play(setup(), [roll(0, 6, 6, 6, 6, 1), score(0, 'sixes')]);
    expect(last(g, { type: 'undo', player: 0 })).toEqual([{ kind: 'undo', player: 0 }]);
  });

  it('sees nothing in a hold, an identical state or the same object', () => {
    const g = play(setup(), [roll(0, 1, 2, 3, 4, 5)]);
    expect(last(g, { type: 'hold', player: 0, die: 0, held: true })).toEqual([]);
    expect(eventsBetween(g, g)).toEqual([]);
    expect(eventsBetween(g, play(setup(), [roll(0, 1, 2, 3, 4, 5)]))).toEqual([]);
  });

  it('does not react to a reconnect that replays the same log', () => {
    const moves = [roll(0, 6, 6, 6, 6, 6), score(0, 'yatzy')];
    expect(eventsBetween(play(setup(), moves), play(setup(), moves))).toEqual([]);
  });

  it('treats a big jump as a catch-up, not play', () => {
    const before = createGame(setup());
    const after = play(setup(), [
      roll(0, 6, 6, 6, 6, 6),
      score(0, 'yatzy'),
      roll(1, 1, 2, 3, 4, 5),
      score(1, 'chance'),
    ]);
    expect(eventsBetween(before, after)).toEqual([]);
  });

  it('keeps rolls before scores when two things land together', () => {
    const before = play(setup(), [roll(0, 6, 6, 6, 6, 1)]);
    const after = applyMove(applyMove(before, score(0, 'sixes')), roll(1, 1, 1, 1, 1, 1));
    expect(eventsBetween(before, after).map((e) => e.kind)).toEqual(['roll', 'score']);
  });

  it('ignores states of different tables', () => {
    expect(
      eventsBetween(createGame(setup()), createGame(setup({ players: 1, turnOrder: [0] }))),
    ).toEqual([]);
  });

  it('works for a second card in a multi-card game', () => {
    const s = setup({ cardsPerPlayer: 2 });
    const g = play(s, [roll(0, 5, 5, 5, 1, 2)]);
    const next = applyMove(g, { type: 'score', player: 0, card: 1, box: 'fives' });
    expect(eventsBetween(g, next)).toMatchObject([{ kind: 'score', box: 'fives', value: 15 }]);
  });

  it('skips a player whose card count differs', () => {
    const a = createGame(setup({ cardsPerPlayer: 2 }));
    const b = { ...a, players: a.players.map((p) => ({ ...p, cards: [...p.cards, p.cards[0]!] })) };
    expect(eventsBetween(a, b)).toEqual([]);
  });
});

describe('isYatzyEvent', () => {
  it('is true for five of a kind rolled and for a Yatzy written in, in any form', () => {
    expect(isYatzyEvent(rolled([2, 2, 2, 2, 2]))).toBe(true);
    expect(isYatzyEvent(scored('yatzy', 50))).toBe(true);
    expect(isYatzyEvent(scored('twos', 10, true))).toBe(true);
  });

  it('is false for everything else', () => {
    expect(isYatzyEvent(rolled([2, 2, 2, 2, 3]))).toBe(false);
    expect(isYatzyEvent(scored('yatzy', 0))).toBe(false);
    expect(isYatzyEvent(scored('chance', 20))).toBe(false);
    expect(isYatzyEvent({ kind: 'undo', player: 0 })).toBe(false);
  });
});

describe('petMood', () => {
  it('cheers a Yatzy, rolled or written', () => {
    expect(petMood(rolled([6, 6, 6, 6, 6]))).toBe('cheer');
    expect(petMood(scored('yatzy', 50))).toBe('cheer');
  });

  it('is happy about four of a kind, a full house and straights', () => {
    expect(petMood(rolled([4, 4, 4, 4, 1]))).toBe('happy');
    expect(petMood(rolled([2, 2, 5, 5, 5]))).toBe('happy');
    expect(petMood(rolled([1, 2, 3, 4, 6]))).toBe('happy');
    expect(petMood(rolled([2, 3, 4, 5, 6]))).toBe('happy');
  });

  it('is happy about any score above zero', () => {
    expect(petMood(scored('ones', 3))).toBe('happy');
  });

  it('is sad about a zero, a bust', () => {
    expect(petMood(scored('fullHouse', 0))).toBe('sad');
  });

  it('is sad about a last roll with nothing in it, but only the last', () => {
    expect(petMood(rolled([1, 2, 4, 4, 6], 3))).toBe('sad');
    expect(petMood(rolled([1, 2, 4, 4, 6], 2))).toBe(null);
  });

  it('is not sad about a last roll with three of a kind in it', () => {
    expect(petMood(rolled([1, 2, 4, 4, 4], 3))).toBe(null);
  });

  it('says nothing about an ordinary roll or an undo', () => {
    expect(petMood(rolled([1, 1, 2, 3, 6], 1))).toBe(null);
    expect(petMood({ kind: 'undo', player: 0 })).toBe(null);
  });
});

describe('celebrationStep', () => {
  const roll6 = rolled([6, 6, 6, 6, 6]);

  it('fires on a Yatzy roll', () => {
    expect(celebrationStep(roll6, null)).toEqual({ fire: true, memo: { player: 0, rolled: true } });
  });

  it('does not fire again for the score of the roll that already fired', () => {
    const after = celebrationStep(roll6, null).memo;
    expect(celebrationStep(scored('yatzy', 50), after)).toEqual({ fire: false, memo: null });
    // And the next Yatzy, a fresh roll, fires again.
    expect(celebrationStep(roll6, null).fire).toBe(true);
  });

  it('fires on a Yatzy score whose roll was never seen live', () => {
    expect(celebrationStep(scored('yatzy', 50), null).fire).toBe(true);
    expect(celebrationStep(scored('twos', 10, true), null).fire).toBe(true);
  });

  it("does not take another player's Yatzy score as its own", () => {
    const memo: CelebrationMemo = { player: 1, rolled: true };
    expect(celebrationStep(scored('yatzy', 50), memo).fire).toBe(true);
  });

  it('never fires for ordinary moves, and a plain roll forgets', () => {
    expect(celebrationStep(rolled([1, 2, 3, 4, 5]), { player: 0, rolled: true })).toEqual({
      fire: false,
      memo: null,
    });
    expect(celebrationStep(scored('chance', 20), null)).toEqual({ fire: false, memo: null });
    const memo: CelebrationMemo = { player: 0, rolled: true };
    expect(celebrationStep({ kind: 'undo', player: 0 }, memo)).toEqual({ fire: false, memo });
  });
});

describe('who the pet is', () => {
  it('follows whoever just acted in Take turns, while they react', () => {
    expect(petOwner('turns', 1, 0)).toBe(0);
    expect(petOwner('turns', 1, null)).toBe(1);
  });

  it('stays with the tray player in Everyone at once', () => {
    expect(petOwner('together', 1, 0)).toBe(1);
  });

  it('reacts to everyone in Take turns, and only to the tray player at once', () => {
    const e = rolled([1, 2, 3, 4, 5]);
    expect(reactsTo('turns', 1, e)).toBe(true);
    expect(reactsTo('together', 1, e)).toBe(false);
    expect(reactsTo('together', 0, e)).toBe(true);
  });
});

describe('pets and poses', () => {
  it('lists the four catalog pets', () => {
    expect(PET_IDS).toEqual(['toad', 'blackCat', 'bat', 'ghostCheerleader']);
    expect(isPetId('toad')).toBe(true);
    expect(isPetId('dragon')).toBe(false);
  });

  it('gives only the ghost cheerleader a cheer; the others are happy', () => {
    expect(poseFor('ghostCheerleader', 'cheer')).toBe('cheer');
    expect(poseFor('toad', 'cheer')).toBe('happy');
    expect(poseFor('bat', 'sad')).toBe('sad');
    for (const pet of PET_IDS) expect(PET_POSES[pet].slice(0, 3)).toEqual(['idle', 'happy', 'sad']);
  });
});
