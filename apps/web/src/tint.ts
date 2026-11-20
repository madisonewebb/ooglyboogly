import type { TintId } from '@rollhouse/shared';
import { type Tint, TINTS, type ThemeName } from './theme/palette';

export const tintOf = (id: TintId | undefined): Tint => TINTS[id ?? 'rose'];

/** CSS variables for one player: --hue for chips and pops, --ink for their numbers. */
export function tintVars(id: TintId | undefined, theme: ThemeName): React.CSSProperties {
  const f = tintOf(id);
  return { ['--hue' as string]: f.hue, ['--ink' as string]: f.ink[theme] };
}
