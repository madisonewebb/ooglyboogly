/**
 * Seaweed fronds in the manner of Anna Atkins' 1843 cyanotypes, after her
 * plate of Dictyota dichotoma: flat, wavy ribbons that rise from a holdfast
 * and split in two, again and again, into a fan. Each ribbon is a filled
 * blade. Drawn from a seed, so a frond looks the same on every screen and in
 * every theme.
 */

export interface Frond {
  /** Filled outlines, stem first; `level` is how many forks from the stem. */
  blades: { d: string; level: number }[];
  viewBox: string;
  width: number;
  height: number;
}

/** A small seeded generator (Park–Miller), so fronds are reproducible. */
function seeded(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const cache = new Map<string, Frond>();
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A frond growing up from the bottom of its box. `depth` is how many times it
 * forks (3 is Atkins' plate, 2 is sparse); `lean` tilts the whole frond.
 */
export function frond(seed: number, depth = 3, lean = 0): Frond {
  const key = `${seed}:${depth}:${lean}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rand = seeded(seed);
  const blades: { d: string; level: number }[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  /**
   * One ribbon: a short chain of arcs whose curl swings back and forth, so it
   * waves, outlined at a width that narrows a little toward its end. Then it
   * forks in two, the halves a little narrower, until `depth` runs out.
   */
  const ribbon = (
    x: number,
    y: number,
    angle: number,
    len: number,
    wide: number,
    level: number,
  ) => {
    const segs = 3;
    const step = len / segs;
    const phase = rand() * Math.PI * 2;
    const swing = 0.12 + rand() * 0.12;
    const line: [number, number][] = [[x, y]];
    let a = angle;
    let px = x;
    let py = y;
    for (let k = 0; k < segs; k++) {
      const curl = Math.sin(phase + k * 1.7) * swing;
      const l = step * (0.9 + rand() * 0.2);
      const cx = px + Math.cos(a + curl * 0.5) * l * 0.5;
      const cy = py + Math.sin(a + curl * 0.5) * l * 0.5;
      const ex = cx + Math.cos(a + curl) * l * 0.5;
      const ey = cy + Math.sin(a + curl) * l * 0.5;
      for (const t of [0.25, 0.5, 0.75, 1]) {
        const u = 1 - t;
        line.push([
          u * u * px + 2 * u * t * cx + t * t * ex,
          u * u * py + 2 * u * t * cy + t * t * ey,
        ]);
      }
      px = ex;
      py = ey;
      a += curl;
    }

    const last = level >= depth;
    const n = line.length;
    // Ribbons hold their width; the last ones round off to a blunt tip.
    const width = (i: number) => {
      const t = i / (n - 1);
      return last
        ? wide * (1 - 0.35 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 6)))
        : wide * (1 - 0.12 * t);
    };
    const left: string[] = [];
    const right: string[] = [];
    for (let i = 0; i < n; i++) {
      const [ax, ay] = line[Math.max(0, i - 1)]!;
      const [bx, by] = line[Math.min(n - 1, i + 1)]!;
      const tl = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / tl;
      const ny = (bx - ax) / tl;
      const w = width(i) / 2;
      const [cx, cy] = line[i]!;
      left.push(`${r1(cx + nx * w)} ${r1(cy + ny * w)}`);
      right.push(`${r1(cx - nx * w)} ${r1(cy - ny * w)}`);
      minX = Math.min(minX, cx - w);
      maxX = Math.max(maxX, cx + w);
      minY = Math.min(minY, cy - w);
      maxY = Math.max(maxY, cy + w);
    }
    blades.push({ d: `M${left.join('L')}L${right.reverse().join('L')}Z`, level });
    if (last) return;

    // Split in two, one half often a little longer than the other.
    const spread = 0.26 + rand() * 0.16;
    const skew = (rand() - 0.5) * 0.2;
    const childLen = len * (0.9 + rand() * 0.12);
    const childWide = wide * 0.86;
    ribbon(px, py, a - spread + skew, childLen * (0.9 + rand() * 0.2), childWide, level + 1);
    ribbon(px, py, a + spread + skew, childLen * (0.9 + rand() * 0.2), childWide, level + 1);
  };

  // Two broad ribbons rise from one holdfast and fork from there: no trunk.
  const tilt = -Math.PI / 2 + lean;
  ribbon(0, 0, tilt - 0.36 - rand() * 0.1, 30 + rand() * 6, 10, 0);
  ribbon(0, 0, tilt + 0.36 + rand() * 0.1, 26 + rand() * 6, 9.2, 0);

  const pad = 4;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;
  const result: Frond = {
    blades,
    viewBox: `${r1(minX - pad)} ${r1(minY - pad)} ${r1(width)} ${r1(height)}`,
    width,
    height,
  };
  cache.set(key, result);
  return result;
}
