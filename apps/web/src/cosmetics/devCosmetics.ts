import type { Equipped } from '@rollhouse/shared';
import { parseCosmeticsOverride } from './parseCosmeticsOverride';

/** True on the dev server and in builds made with VITE_LAB=1; never in production. */
export const labEnabled = (): boolean => import.meta.env.DEV || import.meta.env.VITE_LAB === '1';

let cached: Equipped | null | undefined;

/**
 * The `?cosmetics=` override, or null when there is none or the lab is off.
 * Read once: the URL does not change during a session.
 */
export function devCosmetics(): Equipped | null {
  if (cached !== undefined) return cached;
  const found = labEnabled() ? parseCosmeticsOverride(location.search) : {};
  cached = Object.keys(found).length > 0 ? found : null;
  return cached;
}
