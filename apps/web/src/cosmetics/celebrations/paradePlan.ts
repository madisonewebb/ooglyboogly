/**
 * The Ghost Parade's choreography as plain data: how many ghosts, which hat
 * each wears, when each steps off and how it bobs. Fixed patterns, no
 * randomness, so every screen marches the same parade.
 */

export type Hat = 'witch' | 'bow' | 'party' | undefined;

export interface ParadeGhost {
  index: number;
  hat: Hat;
  /** When this ghost starts its walk, from the start of the parade. */
  delayMs: number;
  /** One bob (a little hop) takes this long. */
  bobMs: number;
  /** Start the bob at a different point, so the line does not hop in step. */
  bobOffsetMs: number;
  /** Size relative to the others, 1 = normal. */
  scale: number;
}

/** A ghost takes this long to cross the whole screen. */
export const CROSS_MS = 4600;
/** Time between one ghost stepping off and the next. */
export const STEP_MS = 420;
/** How long the parade stands on screen with reduced motion (no marching). */
export const STILL_MS = 3000;

const HATS: readonly Hat[] = [undefined, 'witch', 'bow', 'party', undefined, 'witch', 'bow'];

export function paradePlan(count = 7): ParadeGhost[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    hat: HATS[index % HATS.length],
    delayMs: index * STEP_MS,
    bobMs: 520 + (index % 3) * 60,
    bobOffsetMs: -((index * 170) % 520),
    scale: index % 4 === 3 ? 0.85 : 1,
  }));
}

/** From the first ghost stepping off to the last leaving the screen. */
export function paradeDuration(count = 7, reduced = false): number {
  return reduced ? STILL_MS : (count - 1) * STEP_MS + CROSS_MS;
}

/** What a screen reader hears. */
export function paradeAnnouncement(name: string): string {
  return `Yatzy! ${name}'s ghost parade marches by.`;
}
