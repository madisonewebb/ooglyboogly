/**
 * The tank's world: a long, low planted tank (2:1, like a 90 × 45 cm aquascape)
 * in its own units, so drawing and behavior never depend on the canvas size.
 * Depth `z` runs from 0 at the back glass to 1 at the front glass.
 */

export const W = 1000;
export const H = 500;
/** The water's surface. */
export const SURFACE = 30;

/** A small seeded generator (Park–Miller), so a tank looks the same on every screen. */
export function seeded(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * The top of the sand at a point: it rises toward the back, with a mound on
 * the left, the way aquascapers slope a tank to give it depth.
 */
export function floorY(x: number, z: number): number {
  const mound = 26 * Math.exp(-(((x - 270) / 230) ** 2)) * (1 - z * 0.6);
  return H * 0.79 + z * H * 0.14 - mound;
}

/** How large something at depth `z` draws: the back of the tank is farther away. */
export const depthScale = (z: number) => 0.58 + 0.42 * z;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Mixes two #RRGGBB colors; t = 0 is `a`. Returns an rgb() string. */
export function mix(a: string, b: string, t: number, alpha = 1): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = (s: number) => Math.round(lerp(ch(pa, s), ch(pb, s), t));
  return alpha >= 1
    ? `rgb(${c(16)} ${c(8)} ${c(0)})`
    : `rgb(${c(16)} ${c(8)} ${c(0)} / ${alpha.toFixed(3)})`;
}
