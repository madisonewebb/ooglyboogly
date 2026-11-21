import type { Equipped } from '@rollhouse/shared';
import { parseCosmeticsOverride } from './parseCosmeticsOverride';

/** The dev server and VITE_LAB=1 builds only. A build-time constant, so production drops what it guards. */
export const DEV_COSMETICS: boolean = import.meta.env.DEV || import.meta.env.VITE_LAB === '1';

/** `?cosmetics=pet:toad,celebration:ghostParade` where it is allowed, otherwise nothing. */
export function devOverride(): Equipped {
  return DEV_COSMETICS && typeof location !== 'undefined'
    ? parseCosmeticsOverride(location.search)
    : {};
}
