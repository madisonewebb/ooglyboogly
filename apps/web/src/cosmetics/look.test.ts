import { BREWS as CATALOG_BREWS, DICE_SKINS } from '@rollhouse/shared';
import { describe, expect, it } from 'vitest';
import { BREW_IDS, BREWS, brewOf } from './brews/brews';
import { DEFAULT_LOOK, lookOf, resolveEquipped } from './look';
import { SKIN_IDS, SKINS, skinOf } from './skins/skins';

describe('definitions match the catalog', () => {
  it('draws every dice skin the catalog sells, and nothing else', () => {
    expect([...SKIN_IDS].sort()).toEqual(DICE_SKINS.map((i) => i.id).sort());
    expect(Object.keys(SKINS).sort()).toEqual([...SKIN_IDS].sort());
  });

  it('draws every brew the catalog sells, and nothing else', () => {
    expect([...BREW_IDS].sort()).toEqual(CATALOG_BREWS.map((i) => i.id).sort());
    expect(Object.keys(BREWS).sort()).toEqual([...BREW_IDS].sort());
  });

  it('marks all nine skins and brews of this spec available', () => {
    for (const i of [...DICE_SKINS, ...CATALOG_BREWS]) expect(i.available).toBe(true);
  });

  it('gives every skin one distinguishing feature or color', () => {
    const bodies = new Set(Object.values(SKINS).map((s) => s.body));
    expect(bodies.size).toBe(SKIN_IDS.length);
    expect(SKINS.googly.eyes).toBe(true);
    expect(SKINS.gilded.glint).toBe(true);
    expect(BREWS.starwater.comet).toBe(true);
    expect(BREWS.witchfire.layers[0]!.from).toBe('rim');
  });
});

describe('seat to look', () => {
  it('is the default look with nothing equipped', () => {
    expect(lookOf(undefined)).toEqual(DEFAULT_LOOK);
    expect(lookOf({})).toEqual(DEFAULT_LOOK);
  });

  it('picks the skin and the brew independently', () => {
    expect(lookOf({ diceSkin: 'gilded' })).toEqual({ skin: 'gilded', brew: null });
    expect(lookOf({ brew: 'swamp' })).toEqual({ skin: null, brew: 'swamp' });
    expect(lookOf({ diceSkin: 'googly', brew: 'starwater', pet: 'toad' })).toEqual({
      skin: 'googly',
      brew: 'starwater',
    });
  });

  it('falls back to the default for an id this client does not know', () => {
    expect(skinOf({ diceSkin: 'diamond' })).toBeNull();
    expect(brewOf({ brew: 'lava' })).toBeNull();
    expect(skinOf({ diceSkin: 'toString' })).toBeNull();
    expect(brewOf({ brew: 'swamp' })).toBe('swamp');
  });

  it('lets a dev override win, and otherwise uses the seat', () => {
    expect(resolveEquipped({ brew: 'swamp' }, { brew: 'witchfire' })).toEqual({
      brew: 'witchfire',
    });
    expect(resolveEquipped({ brew: 'swamp' }, null)).toEqual({ brew: 'swamp' });
    expect(resolveEquipped(undefined, null)).toBeUndefined();
  });
});
