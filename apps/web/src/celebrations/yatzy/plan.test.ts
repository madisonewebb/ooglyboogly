import { describe, expect, it } from 'vitest';
import {
  bannerLine,
  celebrationDuration,
  CONFETTI_COLORS,
  CONFETTI_COUNT,
  confettiPlan,
  joinNames,
  ringAngles,
  YATZY_MS,
  YATZY_STILL_MS,
} from './plan';
import { playYatzyFanfare, YATZY_FANFARE, YATZY_FANFARE_QUIET } from '../../sound';

describe('confettiPlan', () => {
  const plan = confettiPlan();

  it('is a fixed pattern within the phone budget', () => {
    expect(plan).toHaveLength(CONFETTI_COUNT);
    expect(CONFETTI_COUNT).toBeLessThanOrEqual(60);
    expect(confettiPlan()).toEqual(plan);
  });

  it('uses only palette colors, all of them, and all three shapes', () => {
    expect(new Set(plan.map((p) => p.color))).toEqual(new Set(CONFETTI_COLORS));
    expect(new Set(plan.map((p) => p.shape))).toEqual(new Set(['strip', 'dot', 'star']));
  });

  it('flies outward in every direction and lands lower than the top of its arc', () => {
    expect(plan.some((p) => p.burstX < 0)).toBe(true);
    expect(plan.some((p) => p.burstX > 0)).toBe(true);
    for (const p of plan) expect(p.fallY).toBeGreaterThan(p.burstY);
  });

  it('finishes inside the celebration', () => {
    const last = Math.max(...plan.map((p) => p.delayMs));
    expect(last + 3300).toBeLessThanOrEqual(YATZY_MS);
  });
});

describe('timing and words', () => {
  it('runs 3 to 4 seconds, or 2.5 with reduced motion', () => {
    expect(celebrationDuration(false)).toBe(YATZY_MS);
    expect(YATZY_MS).toBeGreaterThanOrEqual(3000);
    expect(YATZY_MS).toBeLessThanOrEqual(4000);
    expect(celebrationDuration(true)).toBe(YATZY_STILL_MS);
    expect(YATZY_STILL_MS).toBe(2500);
  });

  it('spaces the ring evenly around the banner', () => {
    const a = ringAngles();
    expect(a).toHaveLength(12);
    expect(a[0]).toBe(0);
    expect(a[11]).toBe(330);
  });

  it('says who rolled it', () => {
    expect(bannerLine(['Madi'])).toBe('Madi rolled a Yatzy!');
    expect(bannerLine(['Madi', 'Sam'])).toBe('Madi and Sam rolled Yatzys!');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
    expect(joinNames([])).toBe('Someone');
  });
});

describe('fanfare', () => {
  it('is a short run that is over inside the celebration, and quieter when reduced', () => {
    for (const set of [YATZY_FANFARE, YATZY_FANFARE_QUIET]) {
      for (const [, start, , decay] of set) expect(start + decay).toBeLessThan(YATZY_MS / 1000);
    }
    const peak = (s: typeof YATZY_FANFARE) => Math.max(...s.map((n) => n[2]));
    expect(peak(YATZY_FANFARE_QUIET)).toBeLessThan(peak(YATZY_FANFARE));
  });

  it('stays silent, without throwing, until audio has been unlocked (or when muted)', () => {
    expect(() => playYatzyFanfare()).not.toThrow();
    expect(() => playYatzyFanfare(true)).not.toThrow();
  });
});
