import { type Equipped, fitsSlot, isSlot } from '@rollhouse/shared';

/**
 * Dev-only preview: `?cosmetics=pet:toad,celebration:ghostParade` reads as an
 * Equipped. Unknown slots, ids that don't belong in their slot and malformed
 * pairs are ignored. Callers only use it on the dev server and in VITE_LAB=1
 * builds.
 */
export function parseCosmeticsOverride(search: string): Equipped {
  const raw = new URLSearchParams(search).get('cosmetics') ?? '';
  const out: Equipped = {};
  for (const pair of raw.split(',')) {
    const [slot, id] = pair.split(':');
    if (isSlot(slot) && fitsSlot(slot, id)) out[slot] = id;
  }
  return out;
}
