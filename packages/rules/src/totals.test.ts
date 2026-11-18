import { describe, expect, it } from 'vitest';
import { cardTotal, playerTotal } from './totals';
import { card, newGame, withCard } from './test-helpers';

describe('cardTotal', () => {
  it('adds the upper bonus at exactly 63', () => {
    const c = card({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
    expect(cardTotal(c, 0, false)).toMatchObject({ upper: 63, upperBonus: 35, raw: 98 });
  });

  it('gives no upper bonus at 62', () => {
    const c = card({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
    expect(cardTotal(c, 0, false)).toMatchObject({ upper: 62, upperBonus: 0, raw: 62 });
  });

  it('adds the lower section and 100 per Yatzy bonus', () => {
    const c = card({ yatzy: 50, fullHouse: 25, chance: 22, sixes: 30 }, 2);
    expect(cardTotal(c, 0, false)).toEqual({
      upper: 30,
      upperBonus: 0,
      lower: 97,
      yatzyBonus: 200,
      raw: 327,
      multiplier: 1,
      total: 327,
    });
  });

  it('multiplies by the card position with classic multipliers', () => {
    const c = card({ chance: 20 });
    expect(cardTotal(c, 0, true)).toMatchObject({ raw: 20, multiplier: 1, total: 20 });
    expect(cardTotal(c, 2, true)).toMatchObject({ raw: 20, multiplier: 3, total: 60 });
    expect(cardTotal(c, 4, true)).toMatchObject({ multiplier: 5, total: 100 });
    expect(cardTotal(c, 4, false)).toMatchObject({ multiplier: 1, total: 20 });
  });
});

describe('playerTotal', () => {
  it('sums every card, after multipliers', () => {
    let g = newGame({ cardsPerPlayer: 3, multipliers: true });
    g = withCard(g, 0, 0, card({ chance: 10 }));
    g = withCard(g, 0, 1, card({ chance: 10 }));
    g = withCard(g, 0, 2, card({ chance: 10 }));
    const t = playerTotal(g, 0);
    expect(t.cards.map((c) => c.total)).toEqual([10, 20, 30]);
    expect(t.total).toBe(60);
  });
});
