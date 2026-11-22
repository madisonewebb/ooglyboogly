/**
 * Super powers: consumable, one-use items sold in the shop. Unlike cosmetics a
 * power is never worn and can be bought again and again; the server keeps a
 * count per player and takes one off it each time the power is used.
 * Ids, names, blurbs and prices live here; what a power does is in the rules
 * package (the `extraTurn` and `unscratch` moves).
 */

export const POWER_IDS = ['extraTurn', 'unscratch'] as const;
export type PowerId = (typeof POWER_IDS)[number];

export interface Power {
  id: PowerId;
  name: string;
  /** One line for the shop card. */
  blurb: string;
  price: number;
}

export const POWERS: readonly Power[] = [
  {
    id: 'extraTurn',
    name: 'Extra Turn',
    blurb: 'Out of rolls? Take a fresh set of rolls this turn and keep going.',
    price: 80,
  },
  {
    id: 'unscratch',
    name: 'Unscratch',
    blurb: 'Reopen a box of yours that was scratched to zero, to score it again.',
    price: 60,
  },
];

export const isPowerId = (v: unknown): v is PowerId =>
  (POWER_IDS as readonly unknown[]).includes(v);

export const powerById = (id: unknown): Power | undefined =>
  isPowerId(id) ? POWERS.find((p) => p.id === id) : undefined;

/** How many of each power a player owns. A power they have none of may be missing. */
export type PowerStock = Partial<Record<PowerId, number>>;
