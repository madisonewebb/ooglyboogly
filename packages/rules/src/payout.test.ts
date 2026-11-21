import { describe, expect, it } from 'vitest';
import { computePayouts, FINISH_COINS, scaled, SOLO_COINS, YATZY_COINS } from './payout';
import { card, finishedGame, newGame } from './test-helpers';
import type { Card } from './types';

/** `n` copies of one card: a player whose every card is the same. */
const cards = (n: number, c: Card): Card[] => Array.from({ length: n }, () => c);

const LOW = card({ chance: 10 });
const HIGH = card({ chance: 25 });
const YATZY_CARD = card({ yatzy: 50, chance: 5 });

/** A two-player game of `n` cards where player 0 wins and nobody scores a Yatzy. */
const twoPlayer = (n: number) => finishedGame([cards(n, HIGH), cards(n, LOW)], {});

describe('computePayouts, finish and win by card count', () => {
  // cards: [finish, win] for the winner; the loser gets the finish amount only.
  it.each([
    [1, 3],
    [2, 7],
    [3, 10],
    [4, 13],
    [5, 17],
  ])('%i card(s) pays %i for finishing and the same again for winning', (n, amount) => {
    const [winner, loser] = computePayouts(twoPlayer(n));
    expect(winner!.breakdown).toEqual({ finish: amount, win: amount, yatzy: 0 });
    expect(winner!.total).toBe(amount * 2);
    expect(loser!.breakdown).toEqual({ finish: amount, win: 0, yatzy: 0 });
    expect(loser!.total).toBe(amount);
  });

  it('pays seats in seat order, whoever wins', () => {
    const result = computePayouts(finishedGame([cards(3, LOW), cards(3, HIGH)]));
    expect(result.map((r) => r.player)).toEqual([0, 1]);
    expect(result.map((r) => r.breakdown.win)).toEqual([0, 10]);
  });

  it('adds the totals of every card when deciding the winner', () => {
    // Player 0 has one big card and two empty ones; player 1 has three medium ones.
    const result = computePayouts(
      finishedGame([[card({ chance: 30 }), card(), card()], cards(3, card({ chance: 12 }))]),
    );
    expect(result[1]!.breakdown.win).toBe(10);
    expect(result[0]!.breakdown.win).toBe(0);
  });
});

describe('computePayouts, ties', () => {
  it('splits the win bonus between two winners, rounded down', () => {
    const result = computePayouts(finishedGame([cards(2, HIGH), cards(2, HIGH), cards(2, LOW)]));
    // 2 cards: finish 7, so the 7-coin win bonus splits 3 and 3.
    expect(result.map((r) => r.breakdown.win)).toEqual([3, 3, 0]);
    expect(result.map((r) => r.total)).toEqual([10, 10, 7]);
  });

  it('splits it three ways in a 1-card game, paying 1 each', () => {
    const result = computePayouts(finishedGame([[HIGH], [HIGH], [HIGH]]));
    expect(result.map((r) => r.breakdown)).toEqual([
      { finish: 3, win: 1, yatzy: 0 },
      { finish: 3, win: 1, yatzy: 0 },
      { finish: 3, win: 1, yatzy: 0 },
    ]);
  });

  it('gives the whole bonus to a lone winner', () => {
    expect(computePayouts(twoPlayer(3))[0]!.breakdown.win).toBe(10);
  });
});

describe('computePayouts, Yatzy', () => {
  it('pays the Yatzy bonus once when the Yatzy box holds 50', () => {
    const result = computePayouts(finishedGame([cards(3, YATZY_CARD), cards(3, LOW)]));
    expect(result[0]!.breakdown.yatzy).toBe(3);
    expect(result[1]!.breakdown.yatzy).toBe(0);
  });

  it('pays it when a later card has a Yatzy bonus and no other card has the box', () => {
    const result = computePayouts(
      finishedGame([
        [card({ chance: 20 }), card({ chance: 20 }, 1), card({ chance: 20 })],
        cards(3, LOW),
      ]),
    );
    expect(result[0]!.breakdown.yatzy).toBe(3);
  });

  it('pays it only once for several Yatzys on several cards', () => {
    const many = card({ yatzy: 50 }, 3);
    const result = computePayouts(finishedGame([cards(3, many), cards(3, LOW)]));
    expect(result[0]!.breakdown.yatzy).toBe(3);
  });

  it('does not pay for a Yatzy box scored as 0', () => {
    const result = computePayouts(finishedGame([cards(3, card({ yatzy: 0 })), cards(3, LOW)]));
    expect(result[0]!.breakdown.yatzy).toBe(0);
  });

  it('scales the Yatzy bonus with the cards: 1 for one card, 5 for five', () => {
    const one = computePayouts(finishedGame([[YATZY_CARD], [LOW]]));
    const five = computePayouts(finishedGame([cards(5, YATZY_CARD), cards(5, LOW)]));
    expect(one[0]!.breakdown.yatzy).toBe(1);
    expect(five[0]!.breakdown.yatzy).toBe(5);
  });

  it('pays the Yatzy bonus to a loser as well as a winner', () => {
    const winner = card({ chance: 30, yatzy: 50 });
    const loser = card({ yatzy: 50 });
    const result = computePayouts(finishedGame([cards(3, winner), cards(3, loser)]));
    expect(result[1]!.breakdown).toEqual({ finish: 10, win: 0, yatzy: 3 });
  });
});

describe('computePayouts, solo and unfinished games', () => {
  it.each([1, 3, 5])('pays a flat 1 coin for a solo game of %i card(s)', (n) => {
    const result = computePayouts(finishedGame([cards(n, YATZY_CARD)]));
    expect(result).toEqual([
      { player: 0, total: SOLO_COINS, breakdown: { finish: 1, win: 0, yatzy: 0 } },
    ]);
  });

  it('refuses a game that is not finished', () => {
    expect(() => computePayouts(newGame({ players: 2 }))).toThrow(/finished/);
  });
});

describe('scaled', () => {
  it('matches the base amounts at 3 cards', () => {
    expect(scaled(FINISH_COINS, 3)).toBe(10);
    expect(scaled(YATZY_COINS, 3)).toBe(3);
  });

  it('rounds to the nearest coin', () => {
    expect(scaled(10, 1)).toBe(3); // 3.33
    expect(scaled(10, 2)).toBe(7); // 6.67
    expect(scaled(10, 4)).toBe(13); // 13.33
    expect(scaled(10, 5)).toBe(17); // 16.67
  });
});
