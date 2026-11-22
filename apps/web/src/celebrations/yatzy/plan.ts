/**
 * The Yatzy celebration as plain data: how many confetti pieces, where each
 * one flies and when, how long the whole thing runs, and what a screen reader
 * hears. No randomness: every screen at the table draws the same burst.
 */

/** The whole celebration, from the burst to the banner leaving. */
export const YATZY_MS = 3600;
/** With reduced motion: the banner and a still ring of stars. */
export const YATZY_STILL_MS = 2500;
/** Confetti pieces; the phone budget is about 60 moving things. */
export const CONFETTI_COUNT = 54;
/** Stars in the still ring. */
export const RING_COUNT = 12;

/** Colors are palette tokens (see theme/palette.ts), so every scheme and theme works. */
export const CONFETTI_COLORS = ['accent', 'strong', 'option', 'pip'] as const;
export type ConfettiColor = (typeof CONFETTI_COLORS)[number];
export type ConfettiShape = 'strip' | 'dot' | 'star';

export interface Piece {
  index: number;
  color: ConfettiColor;
  shape: ConfettiShape;
  /** Where it flies to at the top of its arc, from the burst point, in vw and vh. */
  burstX: number;
  burstY: number;
  /** Where it lands, in vw and vh from the burst point. */
  fallX: number;
  fallY: number;
  /** Spin over the whole flight. */
  turns: number;
  delayMs: number;
  /** Size in rem. */
  size: number;
}

/** A small fixed hash, so the pattern looks scattered but is the same everywhere. */
const mix = (i: number, k: number) => (((i + 1) * 2654435761 + k * 40503) >>> 0) % 1000;

export function confettiPlan(count = CONFETTI_COUNT): Piece[] {
  return Array.from({ length: count }, (_, index) => {
    // Spread around the circle, with a lean upward so it reads as a burst.
    const angle = (index / count) * Math.PI * 2 + (mix(index, 1) / 1000 - 0.5) * 0.5;
    const reach = 22 + (mix(index, 2) / 1000) * 30;
    const burstX = Math.cos(angle) * reach;
    const burstY = Math.sin(angle) * reach * 0.8 - 8;
    const shape: ConfettiShape = index % 5 === 4 ? 'star' : index % 5 === 2 ? 'dot' : 'strip';
    return {
      index,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
      shape,
      burstX,
      burstY,
      fallX: burstX * 1.25 + (mix(index, 3) / 1000 - 0.5) * 10,
      fallY: burstY + 55 + (mix(index, 4) / 1000) * 25,
      turns: ((mix(index, 5) % 5) + 1) * (index % 2 ? 1 : -1),
      delayMs: (index % 6) * 45,
      size: shape === 'star' ? 0.9 + (mix(index, 6) % 4) * 0.12 : 0.5 + (mix(index, 6) % 4) * 0.1,
    };
  });
}

/** The stars of the still ring, as angles in degrees around the banner. */
export function ringAngles(count = RING_COUNT): number[] {
  return Array.from({ length: count }, (_, i) => (360 / count) * i);
}

export function celebrationDuration(reduced: boolean): number {
  return reduced ? YATZY_STILL_MS : YATZY_MS;
}

/** "Madi", "Madi and Sam", "Madi, Sam and Ro": whoever rolled it. */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? 'Someone';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** What the banner says, and what a screen reader hears. */
export function bannerLine(names: readonly string[]): string {
  return names.length > 1
    ? `${joinNames(names)} rolled Yatzys!`
    : `${joinNames(names)} rolled a Yatzy!`;
}
