import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  AXES,
  CUP,
  decodeTumbles,
  FACE_AXIS,
  PATHS_PER_COUNT,
  POUR_TIP,
  rotate,
  SLOT_X,
} from './tumbleFormat';
import {
  celebrationFor,
  cupAt,
  hopEnd,
  hopPose,
  poseAt,
  type RollPlan,
  restPos,
  rollSounds,
  timing,
} from './timeline';

const raw = gunzipSync(readFileSync(new URL('./tumbles.bin', import.meta.url)));
const tumbles = decodeTumbles(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));

/** The value showing on top for orientation q. */
function topFace(q: readonly number[]): number {
  let best = { value: 0, dot: -Infinity };
  for (let v = 1; v <= 6; v++) {
    const dot = rotate(q, AXES[FACE_AXIS[v]!]!)[1];
    if (dot > best.dot) best = { value: v, dot };
  }
  return best.value;
}

function plan(
  values: number[],
  held: boolean[],
  pathIndex: number,
  extra: Partial<RollPlan> = {},
): RollPlan {
  const free = held.flatMap((h, i) => (h ? [] : [i]));
  return {
    start: 1000,
    values,
    free,
    held,
    hadDice: true,
    path: tumbles[free.length - 1]![pathIndex]!,
    mirror: false,
    speed: 1,
    reduced: false,
    ...extra,
  };
}

const ALL_FREE = [false, false, false, false, false];

describe('a roll', () => {
  it("lands the server's value face up on every recorded path, mirrored or not", () => {
    for (let count = 1; count <= 5; count++) {
      for (let p = 0; p < PATHS_PER_COUNT; p++) {
        for (const mirror of [false, true]) {
          const held = [0, 1, 2, 3, 4].map((i) => i >= count);
          const values = [0, 1, 2, 3, 4].map((i) => ((p + i * 3) % 6) + 1);
          const r = plan(values, held, p, { mirror });
          const t = timing(r);
          for (let die = 0; die < 5; die++) {
            // Already on top when the tumble ends, before the hop into its column.
            if (!held[die]) expect(topFace(poseAt(r, die, t.tidyStart - 1).quat)).toBe(values[die]);
            const rest = poseAt(r, die, t.end);
            expect(topFace(rest.quat)).toBe(values[die]);
            rest.pos.forEach((n, i) => expect(n).toBeCloseTo(restPos(die, held[die]!)[i]!, 5));
          }
        }
      }
    }
  });

  it('hops the dice into their columns without any two paths crossing', () => {
    for (let p = 0; p < PATHS_PER_COUNT; p++) {
      const r = plan([1, 2, 3, 4, 5], ALL_FREE, p, { mirror: p % 2 === 1 });
      const t = timing(r);
      for (let k = 0; k <= 20; k++) {
        const now = t.tidyStart + ((t.end - t.tidyStart) * k) / 20;
        const xs = [0, 1, 2, 3, 4].map((d) => poseAt(r, d, now).pos[0]);
        for (let d = 1; d < 5; d++) expect(xs[d]!).toBeGreaterThanOrEqual(xs[d - 1]! - 1e-9);
      }
    }
  });

  it('reads in about a second and a half, half that with Fast rolls, and settles left to right', () => {
    for (const hadDice of [false, true]) {
      const r = plan([1, 2, 3, 4, 6], ALL_FREE, 0, { hadDice });
      const t = timing(r);
      expect(t.end - r.start).toBeGreaterThan(1100);
      expect(t.end - r.start).toBeLessThan(2000);
      expect(t.settled).toEqual([...t.settled].sort((a, b) => a - b));
      expect(t.settled[1]! - t.settled[0]!).toBe(50);
      const fast = timing({ ...r, speed: 0.5 });
      expect(fast.end - r.start).toBeCloseTo((t.end - r.start) / 2);
    }
  });

  it('just fades the dice in with reduced motion', () => {
    const r = plan([2, 2, 3, 4, 5], [false, false, true, false, false], 0, { reduced: true });
    const t = timing(r);
    expect(t.end - r.start).toBeLessThan(300);
    const mid = poseAt(r, 0, r.start + 100);
    expect(mid.pos).toEqual(restPos(0, false));
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(cupAt(r, r.start + 100).visible).toBe(false);
    expect(rollSounds(r)).toEqual([]);
  });

  it('keeps held dice on the shelf and rattles first-roll dice inside the cup', () => {
    const r = plan([5, 5, 1, 2, 3], [true, true, false, false, false], 3, { hadDice: false });
    const t = timing(r);
    expect(poseAt(r, 0, r.start + 100).pos[2]).toBe(restPos(0, true)[2]);
    const inCup = poseAt(r, 2, (t.shakeStart + t.shakeEnd) / 2);
    expect(inCup.visible).toBe(true);
    expect(Math.hypot(inCup.pos[0] - CUP.x, inCup.pos[2] - CUP.z)).toBeLessThan(CUP.radiusTop);
    expect(inCup.squash[0]).toBeLessThan(1);
  });

  it('scoops a reroll into the cup in an arc', () => {
    const r = plan([1, 2, 3, 4, 5], ALL_FREE, 4, { hadDice: true });
    const mid = poseAt(r, 3, r.start + 200);
    expect(mid.pos[1]).toBeGreaterThan(restPos(3, false)[1] + 0.5);
  });

  it('brings the cup in to rattle and pour, then puts it away', () => {
    const r = plan([1, 2, 3, 4, 5], ALL_FREE, 2);
    const t = timing(r);
    expect(cupAt(r, (t.shakeStart + t.shakeEnd) / 2).visible).toBe(true);
    expect(cupAt(r, t.physStart + 60).tip).toBeLessThan(POUR_TIP * 0.8);
    expect(cupAt(r, t.cupGone + 1).visible).toBe(false);
    expect(cupAt(null, 0).visible).toBe(false);
  });

  it('makes a sound for every collision and a drumroll pop per die', () => {
    const r = plan([1, 2, 3, 4, 5], ALL_FREE, 7);
    const t = timing(r);
    const sounds = rollSounds(r);
    expect(sounds.filter((s) => s.kind === 'pop')).toHaveLength(5);
    expect(sounds.filter((s) => s.kind === 'cup')).toHaveLength(5);
    expect(sounds.filter((s) => s.kind === 'floor').length).toBeGreaterThan(0);
    expect(sounds.map((s) => s.at)).toEqual([...sounds.map((s) => s.at)].sort((a, b) => a - b));
    for (const s of sounds) {
      expect(s.at).toBeGreaterThanOrEqual(r.start);
      expect(s.at).toBeLessThanOrEqual(t.done);
    }
  });

  it('celebrates a Yatzy with a jump and a Large Straight with a wave', () => {
    expect(celebrationFor([4, 4, 4, 4, 4])).toBe('yatzy');
    expect(celebrationFor([3, 5, 2, 4, 6])).toBe('straight');
    expect(celebrationFor([1, 2, 3, 4, 6])).toBeNull();
    const r = plan([6, 6, 6, 6, 6], ALL_FREE, 1);
    const t = timing(r);
    expect(t.done).toBeGreaterThan(t.end);
    const mid = poseAt(r, 2, (t.celebrate + t.done) / 2);
    expect(mid.pos[1]).toBeGreaterThan(restPos(2, false)[1] + 1);
    poseAt(r, 2, t.done + 1).pos.forEach((n, i) => expect(n).toBeCloseTo(restPos(2, false)[i]!, 5));
  });
});

describe('holding a die', () => {
  it('hops from the tray to the shelf in an arc', () => {
    const h = { start: 0, die: 1, value: 3, toShelf: true, speed: 1, reduced: false };
    const mid = hopPose(h, hopEnd(h) / 2);
    expect(mid.pos[1]).toBeGreaterThan(restPos(1, true)[1]);
    expect(mid.pos[0]).toBe(SLOT_X[1]);
    expect(hopPose(h, hopEnd(h) + 500).pos).toEqual(restPos(1, true));
    expect(topFace(hopPose(h, hopEnd(h) + 500).quat)).toBe(3);
  });
});

describe('camera framing', () => {
  it('leaves headroom for the hop and the Yatzy jump on the shelf', async () => {
    const { FRAME, SHELF_Y, DIE_SIZE } = await import('./tumbleFormat');
    const { HOP, JUMP } = await import('./timeline');
    const shelfTop = SHELF_Y + DIE_SIZE;
    expect(FRAME.maxY).toBeGreaterThanOrEqual(shelfTop + JUMP);
    expect(FRAME.maxY).toBeGreaterThanOrEqual(DIE_SIZE + HOP);
  });
});
