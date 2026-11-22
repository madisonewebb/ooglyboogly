import { describe, expect, it } from 'vitest';
import { CATALOG, PRICES } from './catalog';
import { STICKER_IDS } from './protocol';
import {
  PACK_PRICE,
  PACK_STICKER_IDS,
  packOfSticker,
  ALL_SHOP_ENTRIES,
  entryWithPacks,
  PACKS_FOR_SALE,
  SHOP_ENTRIES,
  shopEntry,
  STICKER_PACKS,
} from './packs';

describe('sticker packs', () => {
  it('are priced at the common tier, and always for sale', () => {
    expect(PACK_PRICE).toBe(40);
    for (const p of STICKER_PACKS) {
      expect(p.price).toBe(PRICES.diceSkin.common);
      expect(p.available).toBe(true);
    }
    expect(STICKER_PACKS).toHaveLength(2);
  });

  it('never reuse an id from the catalog or another pack', () => {
    const ids = ALL_SHOP_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(CATALOG.length + STICKER_PACKS.length);
  });

  it('hold every pack sticker exactly once, and none of the free ones', () => {
    const held = STICKER_PACKS.flatMap((p) => [...p.stickers]);
    expect([...held].sort()).toEqual([...PACK_STICKER_IDS].sort());
    for (const s of PACK_STICKER_IDS) expect(STICKER_IDS as readonly string[]).not.toContain(s);
  });

  it('finds the pack that holds a sticker', () => {
    expect(packOfSticker('ribbit')?.id).toBe('cauldronCrew');
    expect(packOfSticker('broom')?.id).toBe('moonlitCharms');
    expect(packOfSticker('cheering')).toBeUndefined();
  });

  it('keeps the packs out of the shop while they are switched off', () => {
    expect(PACKS_FOR_SALE).toBe(false);
    for (const p of STICKER_PACKS) {
      expect(SHOP_ENTRIES.map((e) => e.id)).not.toContain(p.id);
      // Not for sale, so the server's lookup does not know them...
      expect(shopEntry(p.id)).toBeUndefined();
      // ...but they still exist, for tests and for what a player already owns.
      expect(entryWithPacks(p.id)).toMatchObject({ slot: null, price: 40, available: true });
    }
    expect(SHOP_ENTRIES).toHaveLength(CATALOG.length);
  });

  it('looks up shop entries by id, and nothing else', () => {
    expect(shopEntry('bone')).toMatchObject({ slot: 'diceSkin', price: 40 });
    expect(shopEntry('nope')).toBeUndefined();
    expect(shopEntry(7)).toBeUndefined();
    expect(shopEntry({ id: 'bone' })).toBeUndefined();
  });
});
