import { describe, expect, it } from 'vitest';
import { POSES } from './mood';
import { petMotion } from './petMotion';

describe('petMotion', () => {
  it('bobs gently and forever when idle', () => {
    const m = petMotion('idle', false);
    expect(m.body.animate['y']).toEqual([0, -3, 0]);
    expect(m.body.transition).toMatchObject({ repeat: Infinity });
  });

  it('hops once for happy, and further for a cheer than a hop', () => {
    const happy = petMotion('happy', false).body.animate['y'] as number[];
    const cheer = petMotion('cheer', false).body.animate['y'] as number[];
    expect(Math.min(...happy)).toBe(-14);
    expect(Math.min(...cheer)).toBeLessThan(Math.min(...happy));
    expect(petMotion('happy', false).body.transition).not.toHaveProperty('repeat');
  });

  it('slumps for sad, ending low and flat', () => {
    expect(petMotion('sad', false).body.animate).toMatchObject({ y: 2, scaleY: 0.93 });
  });

  it('keeps every key-frame list the same length as its times', () => {
    for (const pose of POSES) {
      const { animate, transition } = petMotion(pose, false).body;
      const times = (transition as { times?: number[] }).times;
      if (times)
        for (const v of Object.values(animate))
          if (Array.isArray(v)) expect(v).toHaveLength(times.length);
    }
  });

  it('is a still frame for every pose with reduced motion', () => {
    for (const pose of POSES) {
      const m = petMotion(pose, true);
      expect(m.body.animate).toEqual({ y: 0, scaleX: 1, scaleY: 1, rotate: 0 });
      expect(m.body.transition).toEqual({ duration: 0 });
      expect(m.shadow.transition).toEqual({ duration: 0 });
    }
  });
});
