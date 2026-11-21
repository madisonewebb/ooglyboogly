import { describe, expect, it } from 'vitest';
import { COMET, cometAt, tipFade } from './Brew';

describe('tipFade', () => {
  it('shows the whole brew while the cauldron is upright or only rattling', () => {
    expect(tipFade(0)).toBe(1);
    expect(tipFade(0.2)).toBe(1);
    expect(tipFade(-0.12)).toBe(1);
  });

  it('fades it out as the cauldron pours, either way it tips', () => {
    expect(tipFade(-1.85)).toBe(0);
    expect(tipFade(1.85)).toBe(0);
    const mid = tipFade(-0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(tipFade(-0.4)).toBeGreaterThan(tipFade(-0.6));
  });
});

describe('the comet', () => {
  it('starts at the cauldron side of the tray and ends past the other side', () => {
    expect(cometAt(0).x).toBeLessThan(-2);
    expect(cometAt(1).x).toBeGreaterThan(5);
  });

  it('moves steadily across and stays above the felt', () => {
    let last = -Infinity;
    for (let u = 0; u <= 1; u += 0.1) {
      const p = cometAt(u);
      expect(p.x).toBeGreaterThan(last);
      expect(p.y).toBeGreaterThan(0);
      last = p.x;
    }
  });

  it('is short enough to be a flash, not a scene', () => {
    expect(COMET.ms).toBeLessThan(1500);
    expect(COMET.trail).toBeLessThanOrEqual(16);
  });
});
