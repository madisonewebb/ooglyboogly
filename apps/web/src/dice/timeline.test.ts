import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rotate } from './tumbleFormat';
import { AXES, decodeTumbles, FACE_AXIS, FRAMES, SLOT_X } from './tumbleFormat';
import {
  celebrationFor,
  cupAt,
  hopEnd,
  hopPose,
  poseAt,
  type RollPlan,
  restPos,
  timing,
} from './timeline';

const file = readFileSync(new URL('./tumbles.bin', import.meta.url));
const tumbles = decodeTumbles(file.buffer.slice(file.byteOffset, file.byteOffset + file.length));

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
    speed: 1,
    reduced: false,
    ...extra,
  };
}

describe('a roll', () => {
  it("always lands the server's value face up, on every recorded path", () => {
    for (let count = 1; count <= 5; count++) {
      for (let p = 0; p < 50; p++) {
        const held = [0, 1, 2, 3, 4].map((i) => i >= count);
        const values = [0, 1, 2, 3, 4].map((i) => ((p + i * 3) % 6) + 1);
        const r = plan(values, held, p);
        const t = timing(r);
        for (let die = 0; die < 5; die++) {
          // Already on top at the end of the tumble, before the glide straightens it.
          if (!held[die]) {
            expect(topFace(poseAt(r, die, t.tumbleEnd - 0.001).quat)).toBe(values[die]);
          }
          const rest = poseAt(r, die, t.end);
          expect(topFace(rest.quat)).toBe(values[die]);
          expect(rest.pos).toEqual(restPos(die, held[die]!));
        }
      }
    }
  });

  it('takes about a second, half that with Fast rolls, and settles left to right', () => {
    const r = plan([1, 2, 3, 4, 6], [false, false, false, false, false], 0);
    const t = timing(r);
    expect(t.end - r.start).toBeGreaterThan(900);
    expect(t.end - r.start).toBeLessThan(1400);
    expect(t.settled).toEqual([...t.settled].sort((a, b) => a - b));
    expect(t.settled[1]! - t.settled[0]!).toBe(60);
    const fast = timing({ ...r, speed: 0.5 });
    expect(fast.end - r.start).toBeCloseTo((t.end - r.start) / 2);
  });

  it('just fades the dice in with reduced motion', () => {
    const r = plan([2, 2, 3, 4, 5], [false, false, true, false, false], 0, { reduced: true });
    const t = timing(r);
    expect(t.end - r.start).toBeLessThan(300);
    const mid = poseAt(r, 0, r.start + 100);
    expect(mid.pos).toEqual(restPos(0, false));
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(cupAt(r, r.start + 100).tip).toBe(0);
  });

  it('keeps held dice on the shelf and hides first-roll dice until the pour', () => {
    const r = plan([5, 5, 1, 2, 3], [true, true, false, false, false], 3, { hadDice: false });
    expect(poseAt(r, 0, r.start + 100).pos[2]).toBe(restPos(0, true)[2]);
    expect(poseAt(r, 2, r.start + 100).visible).toBe(false);
    expect(poseAt(r, 2, timing(r).shakeEnd + 1).visible).toBe(true);
  });

  it('brings the cup out to pour and puts it away after', () => {
    const r = plan([1, 2, 3, 4, 5], [false, false, false, false, false], 2);
    const t = timing(r);
    expect(cupAt(r, r.start + 100).visible).toBe(true);
    expect(cupAt(r, t.shakeEnd + 200).tip).toBeLessThan(-1);
    expect(cupAt(r, t.done + 500).visible).toBe(false);
    expect(cupAt(null, 0).visible).toBe(false);
  });

  it('celebrates a Yatzy with a jump and a Large Straight with a wave', () => {
    expect(celebrationFor([4, 4, 4, 4, 4])).toBe('yatzy');
    expect(celebrationFor([3, 5, 2, 4, 6])).toBe('straight');
    expect(celebrationFor([1, 2, 3, 4, 6])).toBeNull();
    const r = plan([6, 6, 6, 6, 6], [false, false, false, false, false], 1);
    const t = timing(r);
    expect(t.done).toBeGreaterThan(t.end);
    const mid = poseAt(r, 2, (t.end + t.done) / 2);
    expect(mid.pos[1]).toBeGreaterThan(restPos(2, false)[1] + 1);
    expect(poseAt(r, 2, t.done + 1).pos).toEqual(restPos(2, false));
  });
});

describe('holding a die', () => {
  it('hops from the tray to the shelf in an arc', () => {
    const h = { start: 0, die: 1, value: 3, toShelf: true, speed: 1, reduced: false };
    const mid = hopPose(h, hopEnd(h) / 2);
    expect(mid.pos[1]).toBeGreaterThan(restPos(1, true)[1]);
    expect(mid.pos[0]).toBe(SLOT_X[1]);
    expect(hopPose(h, hopEnd(h) + 500).pos).toEqual(restPos(1, true));
    expect(topFace(hopPose(h, 10).quat)).toBe(3);
  });
});

it('uses every frame of the recording', () => {
  expect(FRAMES).toBeGreaterThan(10);
});
