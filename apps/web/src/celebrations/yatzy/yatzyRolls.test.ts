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
import { yatzyRollsBetween } from './yatzyRolls';

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
const step = (g: GameState, m: Move) => yatzyRollsBetween(g, applyMove(g, m));

describe('yatzyRollsBetween', () => {
  it('names the player who rolled five of a kind, once', () => {
    const g = createGame(setup());
    expect(step(g, roll(0, 4, 4, 4, 4, 4))).toEqual([0]);
    expect(
      step(play(setup(), [roll(0, 1, 2, 3, 4, 5), score(0, 'ones')]), roll(1, 6, 6, 6, 6, 6)),
    ).toEqual([1]);
  });

  it('fires on the roll only: the state after it, and the score that follows, are quiet', () => {
    const g = play(setup(), [roll(0, 2, 2, 2, 2, 2)]);
    expect(yatzyRollsBetween(g, g)).toEqual([]);
    expect(step(g, score(0, 'yatzy'))).toEqual([]);
  });

  it('does not fire for a roll that is not a Yatzy', () => {
    const g = createGame(setup());
    expect(step(g, roll(0, 3, 3, 3, 3, 2))).toEqual([]);
    expect(step(g, roll(0, 1, 2, 3, 4, 5))).toEqual([]);
  });

  it('does not fire on a reconnect or a replay of the same log', () => {
    const moves = [roll(0, 5, 5, 5, 5, 5), score(0, 'yatzy')];
    const before = play(setup(), moves);
    // A reconnect replays the same moves into a fresh but identical state.
    const replayed = play(setup(), moves);
    expect(replayed).not.toBe(before);
    expect(yatzyRollsBetween(before, replayed)).toEqual([]);
    const mid = play(setup(), [roll(0, 5, 5, 5, 5, 5)]);
    expect(yatzyRollsBetween(mid, play(setup(), [roll(0, 5, 5, 5, 5, 5)]))).toEqual([]);
  });

  it('does not fire for a catch-up that skips several moves', () => {
    const start = createGame(setup());
    const later = play(setup(), [roll(0, 1, 2, 3, 4, 5), roll(0, 6, 6, 6, 6, 6)]);
    expect(yatzyRollsBetween(start, later)).toEqual([]);
    // Nor does a state with a different number of players (another game).
    expect(yatzyRollsBetween(start, createGame(setup({ players: 1, turnOrder: [0] })))).toEqual([]);
  });

  it('fires for each of several Yatzys in one game', () => {
    const solo = setup({ players: 1, turnOrder: [0] });
    const g1 = play(solo, [roll(0, 3, 3, 3, 3, 3), score(0, 'yatzy')]);
    expect(step(g1, roll(0, 3, 3, 3, 3, 3))).toEqual([0]);
    const g2 = play(solo, [
      roll(0, 3, 3, 3, 3, 3),
      score(0, 'yatzy'),
      roll(0, 3, 3, 3, 3, 3),
      score(0, 'threes'),
    ]);
    expect(step(g2, roll(0, 1, 1, 1, 1, 1))).toEqual([0]);
  });

  it('counts a Yatzy on every card of a multi-card game once', () => {
    const g = createGame(setup({ cardsPerPlayer: 3 }));
    expect(step(g, roll(0, 2, 2, 2, 2, 2))).toEqual([0]);
  });

  it('works in Everyone at once and names every roller when two land together', () => {
    const s = setup({ playStyle: 'together' });
    const g = createGame(s);
    expect(step(g, roll(1, 6, 6, 6, 6, 6))).toEqual([1]);
    const both = applyMove(applyMove(g, roll(0, 1, 1, 1, 1, 1)), roll(1, 6, 6, 6, 6, 6));
    expect(yatzyRollsBetween(g, both)).toEqual([0, 1]);
  });

  it('is not fooled by an undo, which raises the roll counter but is no roll', () => {
    const g = play(setup(), [roll(0, 4, 4, 4, 4, 4), score(0, 'yatzy')]);
    expect(step(g, { type: 'undo', player: 0 })).toEqual([]);
  });

  it('does not count holding a Yatzy and rolling again as a new Yatzy', () => {
    const g = play(setup(), [roll(0, 4, 4, 4, 4, 4)]);
    expect(step(g, roll(0, 4, 4, 4, 4, 4))).toEqual([]);
  });
});
