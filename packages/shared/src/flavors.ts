/** The eight candy flavors players pick from. Colors live in the web client's palette. */
export const FLAVOR_IDS = [
  'raspberry',
  'blueberry',
  'tangerine',
  'spearmint',
  'grape',
  'lemon',
  'cottonCandy',
  'cocoa',
] as const;
export type FlavorId = (typeof FLAVOR_IDS)[number];

export const isFlavor = (v: unknown): v is FlavorId =>
  (FLAVOR_IDS as readonly unknown[]).includes(v);

/**
 * A player's flavor when they sit down: their remembered pick if it's free, otherwise
 * the first flavor nobody has. A table seats at most 8, so one is always free.
 */
export function assignFlavor(taken: readonly FlavorId[], pick?: FlavorId | null): FlavorId {
  if (pick && !taken.includes(pick)) return pick;
  return FLAVOR_IDS.find((f) => !taken.includes(f)) ?? FLAVOR_IDS[0];
}
