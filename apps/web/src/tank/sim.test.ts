import { describe, expect, it } from 'vitest';
import { FISH, SHOWCASE, STARTER } from './catalog';
import { TankSim } from './sim';
import { depthScale, floorY, H, SURFACE, W } from './world';

const run = (sim: TankSim, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) sim.step(1 / 30);
};

describe('TankSim', () => {
  it('puts every fish from the layout in the water', () => {
    const sim = new TankSim(SHOWCASE, 3);
    const total = SHOWCASE.fish.reduce((n, f) => n + f.count, 0);
    expect(sim.fish).toHaveLength(total);
  });

  it('opens the same way on every screen', () => {
    const a = new TankSim(STARTER, 5);
    const b = new TankSim(STARTER, 5);
    run(a, 3);
    run(b, 3);
    expect(a.fish.map((f) => [f.x, f.y, f.z])).toEqual(b.fish.map((f) => [f.x, f.y, f.z]));
  });

  it('keeps every animal in the water and above the sand, whatever happens', () => {
    const sim = new TankSim(SHOWCASE, 9);
    for (let round = 0; round < 6; round++) {
      sim.feed();
      sim.tap(W * (round / 6), H / 2);
      if (round === 2) sim.celebrate();
      if (round === 4) sim.welcome();
      run(sim, 10);
      for (const f of sim.fish) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x).toBeLessThanOrEqual(W);
        expect(f.y).toBeGreaterThanOrEqual(SURFACE);
        expect(f.y).toBeLessThanOrEqual(floorY(f.x, f.z) + 1);
        expect(f.z).toBeGreaterThanOrEqual(0);
        expect(f.z).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps bottom dwellers on the bottom once they settle', () => {
    const sim = new TankSim({ items: [], fish: [{ id: 'cherryShrimp', count: 4 }] }, 2);
    run(sim, 20);
    for (const f of sim.fish) {
      const L = FISH.cherryShrimp.length * depthScale(f.z);
      if (f.mode === 'graze') expect(f.y).toBeCloseTo(floorY(f.x, f.z) - L * 0.22, 0);
    }
  });

  it('eats the food it is given', () => {
    const sim = new TankSim(SHOWCASE, 4);
    sim.feed(W / 2);
    expect(sim.flakes).toHaveLength(14);
    run(sim, 30);
    expect(sim.flakes.length).toBeLessThan(14);
  });

  it('dims into the evening and back', () => {
    const sim = new TankSim(STARTER, 1);
    sim.nightGoal = 1;
    run(sim, 8);
    expect(sim.night).toBeGreaterThan(0.95);
    sim.nightGoal = 0;
    run(sim, 8);
    expect(sim.night).toBeLessThan(0.05);
  });
});
