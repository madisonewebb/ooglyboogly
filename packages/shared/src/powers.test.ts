import { describe, expect, it } from 'vitest';
import { SLOTS } from './catalog';
import { ALL_SHOP_ENTRIES } from './packs';
import { isPowerId, POWER_IDS, powerById, POWERS } from './powers';

describe('powers', () => {
  it('lists each power once, with a positive whole price', () => {
    expect(POWERS.map((p) => p.id)).toEqual([...POWER_IDS]);
    for (const p of POWERS) expect(Number.isInteger(p.price) && p.price > 0).toBe(true);
  });

  it('keeps the agreed prices', () => {
    expect(powerById('extraTurn')?.price).toBe(80);
    expect(powerById('unscratch')?.price).toBe(60);
  });

  it('are not worn and not in the cosmetics shop list', () => {
    for (const id of POWER_IDS) {
      expect(SLOTS as readonly string[]).not.toContain(id);
      expect(ALL_SHOP_ENTRIES.map((e) => e.id)).not.toContain(id);
    }
  });

  it('finds powers by id and nothing else', () => {
    expect(isPowerId('unscratch')).toBe(true);
    expect(isPowerId('bone')).toBe(false);
    expect(powerById('nope')).toBeUndefined();
    expect(powerById(3)).toBeUndefined();
  });
});
