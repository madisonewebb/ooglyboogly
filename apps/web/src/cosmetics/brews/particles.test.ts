import { describe, expect, it } from 'vitest';
import { layerSeeds } from './particles';

describe('layerSeeds', () => {
  const layer = { count: 12, from: 'surface' as const };

  it('is the same every time for the same seed', () => {
    expect(layerSeeds(layer, 3, -0.05, 0.9, 1.2)).toEqual(layerSeeds(layer, 3, -0.05, 0.9, 1.2));
    expect(layerSeeds(layer, 3, -0.05, 0.9, 1.2).positions).not.toEqual(
      layerSeeds(layer, 4, -0.05, 0.9, 1.2).positions,
    );
  });

  it('starts surface particles inside the liquid, at the surface', () => {
    const { positions } = layerSeeds(layer, 1, -0.05, 0.9, 1.2);
    for (let i = 0; i < layer.count; i++) {
      expect(positions[i * 3 + 1]).toBeCloseTo(-0.05);
      expect(Math.hypot(positions[i * 3]!, positions[i * 3 + 2]!)).toBeLessThanOrEqual(1.2);
    }
  });

  it('starts rim particles on the rim, all round it', () => {
    const { positions } = layerSeeds({ count: 14, from: 'rim' }, 1, -0.05, 0.9, 1.25);
    const angles = [];
    for (let i = 0; i < 14; i++) {
      expect(positions[i * 3 + 1]).toBeCloseTo(0.9);
      expect(Math.hypot(positions[i * 3]!, positions[i * 3 + 2]!)).toBeCloseTo(1.25);
      angles.push(Math.atan2(positions[i * 3 + 2]!, positions[i * 3]!));
    }
    // Spread round the whole ring, not bunched on one side.
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(Math.PI * 1.5);
  });

  it('spreads the phases so a layer never bunches up', () => {
    const { seeds } = layerSeeds(layer, 1, 0, 0, 1);
    const phases = Array.from({ length: 12 }, (_, i) => seeds[i * 4]!).sort((a, b) => a - b);
    expect(phases[0]).toBeLessThan(0.1);
    expect(phases[11]).toBeGreaterThan(0.9);
  });
});
