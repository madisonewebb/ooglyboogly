import type { FlavorId } from '@rollhouse/shared';
import { type Flavor, FLAVORS, type ThemeName } from './theme/palette';

export const flavorOf = (id: FlavorId | undefined): Flavor => FLAVORS[id ?? 'raspberry'];

/** CSS variables for one player: --candy for chips and pops, --ink for their numbers. */
export function flavorVars(id: FlavorId | undefined, theme: ThemeName): React.CSSProperties {
  const f = flavorOf(id);
  return { ['--candy' as string]: f.candy, ['--ink' as string]: f.ink[theme] };
}
