import { describe, expect, it } from 'vitest';
import { rollDice } from './dice';

describe('rollDice', () => {
  it('rolls the requested number of dice, each 1 to 6', () => {
    for (let n = 1; n <= 5; n++) {
      const dice = rollDice(n);
      expect(dice).toHaveLength(n);
      for (const d of dice) expect([1, 2, 3, 4, 5, 6]).toContain(d);
    }
  });

  it.each([0, 6, 2.5, -1])('refuses to roll %s dice', (n) => {
    expect(() => rollDice(n)).toThrow(RangeError);
  });

  it('is fair: a million dice pass a chi-square test', () => {
    const ROLLS = 200_000; // x5 dice = 1,000,000
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < ROLLS; i++) for (const d of rollDice(5)) counts[d - 1]! += 1;
    const total = ROLLS * 5;
    const expected = total / 6;
    const chi2 = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    // Critical value for 5 degrees of freedom at alpha = 1e-6: a fair die
    // fails this about once in a million runs, so it essentially never flakes.
    expect(chi2).toBeLessThan(35.888);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(total);
  });
});
