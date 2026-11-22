/**
 * Sticker packs: the first things in the shop that are for sale from day one.
 * A pack is bought like any cosmetic, but it has no slot and nothing to equip:
 * owning it unlocks its stickers in the reaction picker, for good. The default
 * stickers (`STICKER_IDS` in protocol.ts) stay free for everyone.
 *
 * The art lives in the web client (`apps/web/src/art/stickers/packs/`); this
 * file holds only ids, names and prices, like catalog.ts.
 */
import { CATALOG, PRICES, type Rarity, type Slot } from './catalog';
import { STICKER_IDS, type StickerId } from './protocol';

/** Every pack costs the common tier. */
export const PACK_PRICE = PRICES.diceSkin.common;

/** The stickers a pack unlocks. Not sendable without owning the pack that holds them. */
export const PACK_STICKER_IDS = [
  'cackle',
  'mischief',
  'ribbit',
  'foresaw',
  'moonMood',
  'broom',
] as const;
export type PackStickerId = (typeof PACK_STICKER_IDS)[number];

/** A sticker anyone may send, or one from a pack. (Whether the sender owns the pack is checked by the server.) */
export const isSticker = (v: unknown): v is StickerId =>
  (STICKER_IDS as readonly unknown[]).includes(v) ||
  (PACK_STICKER_IDS as readonly unknown[]).includes(v);

export interface StickerPack {
  id: string;
  name: string;
  blurb: string;
  rarity: 'common';
  price: number;
  /** Packs are drawable today, so they are always for sale. */
  available: true;
  stickers: readonly PackStickerId[];
}

export const STICKER_PACKS: readonly StickerPack[] = [
  {
    id: 'cauldronCrew',
    name: 'Cauldron Crew',
    blurb: 'A cackling cauldron, a scheming black cat and a toad with opinions.',
    rarity: 'common',
    price: PACK_PRICE,
    available: true,
    stickers: ['cackle', 'mischief', 'ribbit'],
  },
  {
    id: 'moonlitCharms',
    name: 'Moonlit Charms',
    blurb: 'A crystal ball that saw it coming, a sleepy moon and a broom in a hurry.',
    rarity: 'common',
    price: PACK_PRICE,
    available: true,
    stickers: ['foresaw', 'moonMood', 'broom'],
  },
];

/** The pack that holds this sticker, or undefined for a default (free) sticker. */
export const packOfSticker = (sticker: string): StickerPack | undefined =>
  STICKER_PACKS.find((p) => (p.stickers as readonly string[]).includes(sticker));

/**
 * One thing the shop sells, whether a cosmetic or a pack. The server prices
 * every purchase from this list, never from anything a client sends.
 */
export interface ShopEntry {
  id: string;
  /** The slot a cosmetic is worn in; null for a pack. */
  slot: Slot | null;
  name: string;
  rarity: Rarity;
  price: number;
  blurb: string;
  /** False means "coming soon": listed, not for sale. */
  available: boolean;
}

/**
 * Whether sticker packs are for sale. They are switched off for now (the shop sells gear only), but
 * everything else about them stays: anyone who already owns a pack keeps its stickers in the picker,
 * and turning this on brings the packs back into the shop. Tests use `entryWithPacks` below.
 */
export const PACKS_FOR_SALE = false;

const CATALOG_ENTRIES: readonly ShopEntry[] = CATALOG.map((i): ShopEntry => ({
  id: i.id,
  slot: i.slot,
  name: i.name,
  rarity: i.rarity,
  price: i.price,
  blurb: i.blurb,
  available: i.available,
}));

const PACK_ENTRIES: readonly ShopEntry[] = STICKER_PACKS.map((p): ShopEntry => ({
  id: p.id,
  slot: null,
  name: p.name,
  rarity: p.rarity,
  price: p.price,
  blurb: p.blurb,
  available: p.available,
}));

/** Everything that exists, packs included, whether or not it is for sale right now. */
export const ALL_SHOP_ENTRIES: readonly ShopEntry[] = [...CATALOG_ENTRIES, ...PACK_ENTRIES];

/** What the shop lists and sells. */
export const SHOP_ENTRIES: readonly ShopEntry[] = PACKS_FOR_SALE
  ? ALL_SHOP_ENTRIES
  : CATALOG_ENTRIES;

export const shopEntry = (id: unknown): ShopEntry | undefined =>
  typeof id === 'string' ? SHOP_ENTRIES.find((e) => e.id === id) : undefined;

/** Like `shopEntry`, but packs are found even while they are not for sale. For tests and for reading what a player owns. */
export const entryWithPacks = (id: unknown): ShopEntry | undefined =>
  typeof id === 'string' ? ALL_SHOP_ENTRIES.find((e) => e.id === id) : undefined;
