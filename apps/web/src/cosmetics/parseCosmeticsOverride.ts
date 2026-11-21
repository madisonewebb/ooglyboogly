import { fitsSlot, isSlot, type Equipped } from '@rollhouse/shared';

/**
 * Reads the dev-only `?cosmetics=diceSkin:gilded,brew:witchfire` URL parameter
 * into what a seat would have equipped. Pure: pass `location.search`. Unknown
 * slots, ids that do not belong in their slot and repeated slots are ignored
 * (the first valid one wins), so a typo never breaks the page.
 *
 * Callers must only use it where the lab is enabled (see `devCosmetics`).
 */
export function parseCosmeticsOverride(search: string): Equipped {
  const raw = new URLSearchParams(search).get('cosmetics');
  const out: Equipped = {};
  if (!raw) return out;
  for (const pair of raw.split(',')) {
    const [slot, id] = pair.split(':').map((s) => s.trim());
    if (isSlot(slot) && fitsSlot(slot, id) && out[slot] === undefined) out[slot] = id;
  }
  return out;
}
