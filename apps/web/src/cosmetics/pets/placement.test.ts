import { describe, expect, it } from 'vitest';
import { STAGE_ASPECT } from '../../dice/framing';
import { petPlacement } from './placement';

describe('petPlacement', () => {
  it('puts the pet inside the stage, on the right, in the upper half', () => {
    const p = petPlacement(STAGE_ASPECT);
    expect(p.x).toBeGreaterThan(0.6);
    expect(p.x).toBeLessThan(1);
    expect(p.y).toBeGreaterThan(0.1);
    expect(p.y).toBeLessThan(0.6);
  });

  it('is a sensible size: a pet is about as wide as one to two dice', () => {
    const p = petPlacement(STAGE_ASPECT);
    expect(p.width).toBeGreaterThan(0.06);
    expect(p.width).toBeLessThan(0.3);
  });

  it('stays inside the stage in wide and tall stages alike', () => {
    for (const aspect of [0.7, 1, 1.5, 2.5]) {
      const p = petPlacement(aspect);
      expect(p.x + p.width / 2, `aspect ${aspect}`).toBeLessThanOrEqual(1.05);
      expect(p.x - p.width / 2).toBeGreaterThan(0);
    }
  });

  it('follows a spot moved to the left', () => {
    const right = petPlacement(1.4, [4.75, 0.35, -1.2]);
    const left = petPlacement(1.4, [-4.75, 0.35, -1.2]);
    expect(left.x).toBeLessThan(right.x);
  });
});
