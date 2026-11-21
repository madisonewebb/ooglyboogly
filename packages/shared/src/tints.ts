/** The player tints, named for flowers and leaves. Colors live in the web client's palette. */
export const TINT_IDS = [
  'rose',
  'seaglass',
  'marigold',
  'fern',
  'heather',
  'primrose',
  'poppy',
  'walnut',
  'cornflower',
  'orchid',
] as const;
export type TintId = (typeof TINT_IDS)[number];

export const isTint = (v: unknown): v is TintId => (TINT_IDS as readonly unknown[]).includes(v);

/**
 * A player's tint when they sit down: their remembered pick if it's free, otherwise
 * the first tint nobody has. A table seats at most 8 and there are more tints than that, so one is always free.
 */
export function assignTint(taken: readonly TintId[], pick?: TintId | null): TintId {
  if (pick && !taken.includes(pick)) return pick;
  return TINT_IDS.find((f) => !taken.includes(f)) ?? TINT_IDS[0];
}
