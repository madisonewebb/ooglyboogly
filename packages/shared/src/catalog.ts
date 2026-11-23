/**
 * The shop's catalog: every cosmetic a player can buy, and what each costs.
 * This file is a contract shared by the shop (spec 02), dice skins and brews
 * (spec 03) and celebrations (spec 04). Colors, models and art live in
 * the web client; this file holds only ids, names, rarity and price.
 */

/** What a player can wear. One item per slot is equipped at a time; none means the default look. */
export const SLOTS = [
  'diceSkin',
  'brew',
  'celebration',
  'hair',
  'hat',
  'face',
  'held',
  'aura',
] as const;
export type Slot = (typeof SLOTS)[number];

export const RARITIES = ['common', 'spooky', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

/** Price in coins by slot and rarity. */
export const PRICES: Record<Slot, Record<Rarity, number>> = {
  diceSkin: { common: 40, spooky: 100, legendary: 300 },
  brew: { common: 40, spooky: 100, legendary: 300 },
  celebration: { common: 40, spooky: 100, legendary: 300 },
  hair: { common: 40, spooky: 100, legendary: 300 },
  hat: { common: 40, spooky: 100, legendary: 300 },
  face: { common: 40, spooky: 100, legendary: 300 },
  held: { common: 40, spooky: 100, legendary: 300 },
  aura: { common: 40, spooky: 100, legendary: 300 },
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

/** Spec 04 owns the available flags of this list. */
export const CELEBRATIONS: readonly Item[] = [
  item(
    'celebration',
    'ghostParade',
    'Ghost Parade',
    'spooky',
    'A line of little blobs marches across on a Yatzy.',
    true,
  ),
];

/** The avatar's cosmetics, drawn by the web client's avatar scene. */
export const HAIR: readonly Item[] = [
  item('hair', 'bob', 'Bob', 'common', 'A neat chestnut bob with a fringe.', true),
  item('hair', 'pigtails', 'Pigtails', 'common', 'Honey-blonde, tied with little ribbons.', true),
  item('hair', 'spaceBuns', 'Space Buns', 'spooky', 'Two round buns, high and proud.', true),
  item(
    'hair',
    'longWaves',
    'Long Waves',
    'legendary',
    'Auburn waves down past the shoulders.',
    true,
  ),
];

export const HATS: readonly Item[] = [
  item('hat', 'partyHat', 'Party Hat', 'common', 'A striped cone with a gold pom.', true),
  item('hat', 'bow', 'Bow', 'common', 'A soft lilac bow, tied on top.', true),
  item('hat', 'witchHat', 'Witch Hat', 'spooky', 'Tall, crooked and buckled.', true),
  item('hat', 'crown', 'Crown', 'legendary', 'Gold, with a single violet gem.', true),
];

export const FACES: readonly Item[] = [
  item('face', 'glasses', 'Round Glasses', 'common', 'Thin gold rims, very studious.', true),
  item('face', 'mustache', 'Mustache', 'common', 'A magnificent curled mustache.', true),
  item('face', 'monocle', 'Monocle', 'spooky', 'One lens on a gold chain.', true),
  item('face', 'eyepatch', 'Eyepatch', 'spooky', 'Mysterious. Possibly a pirate.', true),
];

export const HELD: readonly Item[] = [
  item('held', 'wand', 'Wand', 'common', 'A twig with a glowing star tip.', true),
  item('held', 'lantern', 'Lantern', 'spooky', 'A little lantern with a warm flame.', true),
  item('held', 'cauldron', 'Tiny Cauldron', 'spooky', 'A pocket cauldron, gently bubbling.', true),
  item(
    'held',
    'crystalBall',
    'Crystal Ball',
    'legendary',
    'It swirls with something unseen.',
    true,
  ),
];

export const AURAS: readonly Item[] = [
  item('aura', 'sparkles', 'Sparkles', 'common', 'Soft glints that drift upward.', true),
  item('aura', 'candleFlame', 'Candle Flame', 'spooky', 'A small flame follows close by.', true),
  item(
    'aura',
    'orbitingStars',
    'Orbiting Stars',
    'legendary',
    'Three stars circle overhead.',
    true,
  ),
];

export const CATALOG: readonly Item[] = [
  ...DICE_SKINS,
  ...BREWS,
  ...CELEBRATIONS,
  ...HAIR,
  ...HATS,
  ...FACES,
  ...HELD,
  ...AURAS,
];

export type ItemId = string;

/** What a player has on, by slot. A missing slot is the default look. */
export type Equipped = Partial<Record<Slot, ItemId>>;

export const itemById = (id: string): Item | undefined => CATALOG.find((i) => i.id === id);

export const isSlot = (v: unknown): v is Slot => (SLOTS as readonly unknown[]).includes(v);

/** True when `id` is a real item that belongs in `slot`. */
export const fitsSlot = (slot: Slot, id: unknown): id is ItemId =>
  typeof id === 'string' && itemById(id)?.slot === slot;
