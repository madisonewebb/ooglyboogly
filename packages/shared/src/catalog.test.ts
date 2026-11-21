import { describe, expect, it } from 'vitest';
import { CATALOG, fitsSlot, isSlot, itemById, PRICES, RARITIES, SLOTS } from './catalog';

describe('catalog', () => {
  it('gives every item a unique id', () => {
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prices every item from the slot and rarity table', () => {
    for (const i of CATALOG) expect(i.price).toBe(PRICES[i.slot][i.rarity]);
  });

  it('prices rarer items higher in every slot', () => {
    for (const slot of SLOTS) {
      const [c, s, l] = RARITIES.map((r) => PRICES[slot][r]) as [number, number, number];
      expect(c).toBeLessThan(s);
      expect(s).toBeLessThan(l);
    }
  });

  it('has at least one item in every slot', () => {
    for (const slot of SLOTS) expect(CATALOG.some((i) => i.slot === slot)).toBe(true);
  });

  it('keeps the agreed starter prices', () => {
    expect(itemById('bone')!.price).toBe(40);
    expect(itemById('toad')!.price).toBe(60);
    expect(itemById('ghostCheerleader')!.price).toBe(400);
  });

  it('finds items and checks slots', () => {
    expect(itemById('nope')).toBeUndefined();
    expect(isSlot('pet')).toBe(true);
    expect(isSlot('hat')).toBe(false);
    expect(fitsSlot('pet', 'toad')).toBe(true);
    expect(fitsSlot('brew', 'toad')).toBe(false);
    expect(fitsSlot('pet', 7)).toBe(false);
  });
});
