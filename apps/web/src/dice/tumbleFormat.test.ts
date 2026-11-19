import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AXES,
  decodeTumbles,
  encodeTumbles,
  FACE_AXIS,
  FRAMES,
  MAX_DICE,
  PATHS_PER_COUNT,
  rotate,
  TRAY,
  upAxisOf,
} from './tumbleFormat';

const file = readFileSync(new URL('./tumbles.bin', import.meta.url));
const tumbles = decodeTumbles(file.buffer.slice(file.byteOffset, file.byteOffset + file.length));

describe('the recorded tumbles', () => {
  it('has 50 paths for each count of free dice', () => {
    expect(tumbles).toHaveLength(MAX_DICE);
    tumbles.forEach((paths, i) => {
      expect(paths).toHaveLength(PATHS_PER_COUNT);
      for (const path of paths) expect(path).toHaveLength(i + 1);
    });
  });

  it('ends every die at rest in the tray with a clear face up', () => {
    for (const paths of tumbles) {
      for (const path of paths) {
        for (const t of path) {
          const end = t.poses.subarray((FRAMES - 1) * 7, FRAMES * 7);
          const [x, , z] = end;
          expect(x).toBeGreaterThan(TRAY.minX);
          expect(x).toBeLessThan(TRAY.maxX);
          expect(z).toBeGreaterThan(TRAY.minZ);
          expect(z).toBeLessThan(TRAY.maxZ);
          expect(upAxisOf(Array.from(end.subarray(3))).axis).toBe(t.upAxis);
          expect(t.landFrame).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('survives an encode and decode round trip', () => {
    const again = encodeTumbles(tumbles);
    expect(Buffer.from(again).equals(file)).toBe(true);
  });

  it('rejects a file from another format', () => {
    expect(() => decodeTumbles(new ArrayBuffer(16))).toThrow(/not a tumble file/);
  });
});

describe('dice geometry', () => {
  it('puts opposite faces on opposite axes', () => {
    for (let v = 1; v <= 6; v++) {
      const a = AXES[FACE_AXIS[v]!]!;
      const b = AXES[FACE_AXIS[7 - v]!]!;
      expect(a.map((n, i) => n + b[i]!)).toEqual([0, 0, 0]);
    }
  });

  it('rotates vectors by a quaternion', () => {
    // 90 degrees about z takes +x to +y.
    const s = Math.SQRT1_2;
    const [x, y, z] = rotate([0, 0, s, s], [1, 0, 0]);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });
});
