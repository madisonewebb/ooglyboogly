import type { Equipped } from '@rollhouse/shared';
import { devCosmetics } from './devCosmetics';

/**
 * `?cosmetics=pet:toad,celebration:ghostParade` where the lab is on (the dev
 * server and VITE_LAB=1 builds), otherwise nothing. The same switch and the same
 * parser as the dice scene's `devCosmetics`, so there is one rule for both.
 */
export const devOverride = (): Equipped => devCosmetics() ?? {};
