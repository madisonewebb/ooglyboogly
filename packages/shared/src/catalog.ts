/**
 * The shop's catalog: every cosmetic a player can buy, and what each costs.
 * This file is a contract shared by the shop (spec 02), dice skins and brews
 * (spec 03) and pets and celebrations (spec 04). Colors, models and art live in
 * the web client; this file holds only ids, names, rarity and price.
 */

/** What a player can wear. One item per slot is equipped at a time; none means the default look. */
export const SLOTS = ['diceSkin', 'brew', 'pet', 'celebration'] as const;
export type Slot = (typeof SLOTS)[number];

export const RARITIES = ['common', 'spooky', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

/** Price in coins by slot and rarity. Pets cost half again as much as skins and brews. */
export const PRICES: Record<Slot, Record<Rarity, number>> = {
  diceSkin: { common: 40, spooky: 100, legendary: 300 },
  brew: { common: 40, spooky: 100, legendary: 300 },
  pet: { common: 60, spooky: 150, legendary: 400 },
  celebration: { common: 40, spooky: 100, legendary: 300 },
};

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  /** Always `PRICES[slot][rarity]`; a test keeps them in step. */
  price: number;
  /** One line for the shop card. */
  blurb: string;
  /**
   * False until the client can draw it. The shop lists unavailable items as
   * "coming soon" and will not sell them. The spec that builds an item's
   * renderer flips its own items to true.
   */
  available: boolean;
}

const item = (
  slot: Slot,
  id: string,
  name: string,
  rarity: Rarity,
  blurb: string,
  available = false,
): Item => ({ id, slot, name, rarity, price: PRICES[slot][rarity], blurb, available });

/** Spec 03 owns the available flags of the next two lists. */
export const DICE_SKINS: readonly Item[] = [
  item('diceSkin', 'bone', 'Bone', 'common', 'Ivory dice with ink-black pips.', true),
  item('diceSkin', 'obsidian', 'Obsidian', 'common', 'Glossy black dice with silver pips.', true),
  item('diceSkin', 'moonstone', 'Moonstone', 'spooky', 'Milky glass with a soft inner glow.', true),
  item(
    'diceSkin',
    'googly',
    'Googly Eyes',
    'spooky',
    'The pips are tiny eyes that watch the roll.',
    true,
  ),
  item('diceSkin', 'gilded', 'Gilded', 'legendary', 'Gold dice whose pips glint on a Yatzy.', true),
];

export const BREWS: readonly Item[] = [
  item('brew', 'swamp', 'Swamp', 'common', 'Murky green, with slow lazy bubbles.', true),
  item(
    'brew',
    'violetMurk',
    'Violet Murk',
    'common',
    'A deep purple brew that smokes a little.',
    true,
  ),
  item(
    'brew',
    'witchfire',
    'Witchfire',
    'spooky',
    'Green flames lick the rim of the cauldron.',
    true,
  ),
  item(
    'brew',
    'starwater',
    'Starwater',
    'legendary',
    'Glittering bubbles, and a comet on a Yatzy.',
    true,
  ),
];

/** Spec 04 owns the available flags of the next two lists. */
export const PETS: readonly Item[] = [
  item('pet', 'toad', 'Toad', 'common', 'Sits on the rim and croaks at good rolls.', true),
  item('pet', 'blackCat', 'Black Cat', 'spooky', 'Watches the dice, and swats at a bust.', true),
  item('pet', 'bat', 'Bat', 'spooky', 'Hangs from the rim and flaps when you score.', true),
  item(
    'pet',
    'ghostCheerleader',
    'Ghost Cheerleader',
    'legendary',
    'Cheers every score, wildly on a Yatzy.',
    true,
  ),
];

export const CELEBRATIONS: readonly Item[] = [
  item(
    'celebration',
    'ghostParade',
    'Ghost Parade',
    'spooky',
    'A line of little ghosts marches across on a Yatzy.',
    true,
  ),
];

export const CATALOG: readonly Item[] = [...DICE_SKINS, ...BREWS, ...PETS, ...CELEBRATIONS];

export type ItemId = string;

/** What a player has on, by slot. A missing slot is the default look. */
export type Equipped = Partial<Record<Slot, ItemId>>;

export const itemById = (id: string): Item | undefined => CATALOG.find((i) => i.id === id);

export const isSlot = (v: unknown): v is Slot => (SLOTS as readonly unknown[]).includes(v);

/** True when `id` is a real item that belongs in `slot`. */
export const fitsSlot = (slot: Slot, id: unknown): id is ItemId =>
  typeof id === 'string' && itemById(id)?.slot === slot;
