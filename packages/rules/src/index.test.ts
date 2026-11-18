import { describe, expect, it } from 'vitest';
import { DICE_PER_ROLL, FACES } from './index';

describe('rules constants', () => {
  it('rolls five six-sided dice', () => {
    expect(DICE_PER_ROLL).toBe(5);
    expect(FACES).toBe(6);
  });
});
