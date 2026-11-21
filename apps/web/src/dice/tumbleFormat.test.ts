import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  AXES,
  decodeTumbles,
  encodeTumbles,
  FACE_AXIS,
  FPS,
  FRAMES,
  MAX_DICE,
  MIRROR_AXIS,
  PATHS_PER_COUNT,
  REST_BY,
  rotate,
  TRAY,
  upAxisOf,
} from './tumbleFormat';

const raw = gunzipSync(readFileSync(new URL('./tumbles.bin', import.meta.url)));
const tumbles = decodeTumbles(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
const end = (poses: Float32Array) => poses.subarray((FRAMES - 1) * 7, FRAMES * 7);

describe('the recorded tumbles', () => {
  it(`has ${PATHS_PER_COUNT} paths for each count of free dice`, () => {
    expect(tumbles).toHaveLength(MAX_DICE);
    tumbles.forEach((paths, i) => {
      expect(paths).toHaveLength(PATHS_PER_COUNT);
      for (const path of paths) expect(path.tracks).toHaveLength(i + 1);
    });
  });

  it('ends every die at rest, flat, in the tray, with a clear face up', () => {
    for (const paths of tumbles) {
      for (const { tracks } of paths) {
        for (const t of tracks) {
          const [x, y, z] = end(t.poses);
          expect(x).toBeGreaterThan(TRAY.minX);
          expect(x).toBeLessThan(TRAY.maxX);
          expect(z).toBeGreaterThan(TRAY.minZ);
          expect(z).toBeLessThan(TRAY.maxZ);
          expect(y).toBeCloseTo(0.5, 1);
          const up = upAxisOf(Array.from(end(t.poses).subarray(3)));
          expect(up.axis).toBe(t.upAxis);
          expect(up.dot).toBeGreaterThan(0.99);
          expect(t.spawnFrame).toBeLessThan(t.landFrame);
          expect(t.landFrame).toBeLessThanOrEqual(t.restFrame);
          expect(t.restFrame).toBeLessThanOrEqual(REST_BY);
        }
      }
    }
  });

  it('holds still after coming to rest, and waits in the cup before leaving it', () => {
    const t = tumbles[4]![9]!.tracks[2]!;
    const at = (f: number) => Array.from(t.poses.subarray(f * 7, f * 7 + 7));
    expect(at(FRAMES - 1)).toEqual(at(t.restFrame));
    expect(at(0)).toEqual(at(t.spawnFrame));
  });

  it('records the collisions in order, each tied to one of its dice', () => {
    let total = 0;
    for (const [i, paths] of tumbles.entries()) {
      for (const { impacts } of paths) {
        total += impacts.length;
        expect(impacts.map((im) => im.time)).toEqual(
          [...impacts.map((im) => im.time)].sort((a, b) => a - b),
        );
        for (const im of impacts) {
          expect(im.die).toBeLessThanOrEqual(i);
          expect(im.strength).toBeGreaterThanOrEqual(0);
          expect(im.strength).toBeLessThanOrEqual(1);
          expect(im.time).toBeLessThanOrEqual(FRAMES / FPS);
          expect(['floor', 'wall', 'die']).toContain(im.kind);
        }
      }
    }
    // Several per tumble on average: every landing makes a sound.
    expect(total / (MAX_DICE * PATHS_PER_COUNT)).toBeGreaterThan(4);
  });

  it('survives an encode and decode round trip', () => {
    expect(Buffer.from(encodeTumbles(tumbles)).equals(raw)).toBe(true);
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

  it('mirrors a resting die front to back by swapping its z faces', () => {
    for (const { tracks } of tumbles[4]!.slice(0, 20)) {
      for (const t of tracks) {
        const [qx, qy, qz, qw] = Array.from(end(t.poses).subarray(3));
        expect(upAxisOf([-qx!, -qy!, qz!, qw!]).axis).toBe(MIRROR_AXIS[t.upAxis]);
      }
    }
  });
});
