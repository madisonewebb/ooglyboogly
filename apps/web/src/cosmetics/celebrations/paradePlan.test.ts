import { describe, expect, it } from 'vitest';
import {
  CROSS_MS,
  paradeAnnouncement,
  paradeDuration,
  paradePlan,
  STEP_MS,
  STILL_MS,
} from './paradePlan';

describe('paradePlan', () => {
  it('lines up seven ghosts, one stepping off after another', () => {
    const plan = paradePlan();
    expect(plan).toHaveLength(7);
    expect(plan.map((g) => g.delayMs)).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => i * STEP_MS));
  });

  it('is the same every time: nothing random', () => {
    expect(paradePlan()).toEqual(paradePlan());
  });

  it('gives the ghosts different hats and bobs, so the line is not a copy', () => {
    const plan = paradePlan();
    expect(new Set(plan.map((g) => g.hat))).toEqual(new Set([undefined, 'witch', 'bow', 'party']));
    expect(new Set(plan.map((g) => g.bobOffsetMs)).size).toBeGreaterThan(3);
    for (const g of plan) expect(g.bobOffsetMs).toBeLessThanOrEqual(0);
  });

  it('ends when the last ghost has crossed, or after a still moment with reduced motion', () => {
    expect(paradeDuration(7)).toBe(6 * STEP_MS + CROSS_MS);
    expect(paradeDuration(7, true)).toBe(STILL_MS);
  });

  it('announces whose parade it is', () => {
    expect(paradeAnnouncement('Mom')).toBe("Yatzy! Mom's ghost parade marches by.");
  });
});
