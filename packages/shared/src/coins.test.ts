import { describe, expect, it } from 'vitest';
import { createGame, type GameState, UPPER_BOXES } from '@rollhouse/rules';
import { coinsEarned } from './coins';

/** A finished game with each player's cards filled with the given boxes. */
function finished(players: Record<string, number>[][], yatzyBonuses: number[][] = []): GameState {
  const base = createGame({
    players: players.length,
    cardsPerPlayer: players[0]!.length,
    playStyle: 'turns',
    multipliers: false,
    turnOrder: players.map((_, i) => i),
  });
  return {
    ...base,
    finished: true,
    players: base.players.map((p, i) => ({
      ...p,
      cards: players[i]!.map((boxes, c) => ({ boxes, yatzyBonuses: yatzyBonuses[i]?.[c] ?? 0 })),
    })),
  };
}

const plain = { chance: 20, threeKind: 30 }; // 50 points
const upper = Object.fromEntries(UPPER_BOXES.map((b, i) => [b, (i + 1) * 3])); // 63: earns the bonus

describe('coinsEarned', () => {
  it('pays everyone for finishing and for their score', () => {
    const game = finished([[plain], [{ chance: 10 }]]);
    expect(coinsEarned(game, 0)).toEqual({
      finish: 10,
      score: 5,
      win: 15,
      yatzys: 0,
      upperBonuses: 0,
      total: 30,
    });
    expect(coinsEarned(game, 1).total).toBe(10 + 1);
  });

  it('pays the winners of a tie, but nobody wins a game played alone', () => {
    const tie = finished([[plain], [plain]]);
    expect(coinsEarned(tie, 0).win).toBe(15);
    expect(coinsEarned(tie, 1).win).toBe(15);
    expect(coinsEarned(finished([[plain]]), 0).win).toBe(0);
  });

  it('scores on the average card, so more cards do not pay more', () => {
    const one = finished([[plain]]);
    const three = finished([[plain, plain, plain]]);
    expect(coinsEarned(three, 0).score).toBe(coinsEarned(one, 0).score);
  });

  it('pays for every Yatzy, bonuses included, and every upper bonus', () => {
    const game = finished([[{ ...upper, yatzy: 50 }, { yatzy: 0 }]], [[2, 0]]);
    const coins = coinsEarned(game, 0);
    expect(coins.yatzys).toBe(30);
    expect(coins.upperBonuses).toBe(5);
  });
});
