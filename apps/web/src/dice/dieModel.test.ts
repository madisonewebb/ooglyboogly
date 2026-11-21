import { describe, expect, it } from 'vitest';
import { domeGeometry, pipGeometry } from './dieModel';

const checksum = (a: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * ((i % 7) + 1);
  return s.toFixed(4);
};

describe('pipGeometry', () => {
  it('is exactly the pip glaze the dice had before skins (golden checksum)', () => {
    const g = pipGeometry();
    expect(g.getAttribute('position').array.length).toBe(11907);
    expect(g.index!.count).toBe(18900);
    expect(Object.keys(g.attributes)).toEqual(['position', 'normal', 'uv']);
    expect(checksum(g.getAttribute('position').array)).toBe('-3453.6668');
  });
});

describe('domeGeometry', () => {
  it('puts 21 domes on a die, one per pip', () => {
    // 1+2+3+4+5+6 pips, each a dome of equal size.
    const one = domeGeometry(0.1, 0.3, 0.5);
    const per = one.getAttribute('position').count / 21;
    expect(Number.isInteger(per)).toBe(true);
  });

  it('can tag every vertex with its face normal for the eyes', () => {
    const g = domeGeometry(0.1, 0.3, 0.5, true);
    const n = g.getAttribute('aFaceN');
    expect(n.count).toBe(g.getAttribute('position').count);
    for (let i = 0; i < n.count; i++) {
      expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1);
    }
    expect(domeGeometry(0.1, 0.3, 0.5).getAttribute('aFaceN')).toBeUndefined();
  });

  it('keeps every dome on its own face, clear of the die body', () => {
    const g = domeGeometry(0.1, 0.3, 0.5, true);
    const p = g.getAttribute('position');
    const n = g.getAttribute('aFaceN');
    for (let i = 0; i < p.count; i += 7) {
      const along = p.getX(i) * n.getX(i) + p.getY(i) * n.getY(i) + p.getZ(i) * n.getZ(i);
      expect(along).toBeGreaterThanOrEqual(0.5 - 1e-6);
    }
  });
});
