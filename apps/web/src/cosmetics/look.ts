import type { Equipped } from '@rollhouse/shared';
import { brewOf, type BrewId } from './brews/brews';
import { skinOf, type SkinId } from './skins/skins';

/** What the dice scene draws: null means the default look, exactly as before cosmetics. */
export interface Look {
  skin: SkinId | null;
  brew: BrewId | null;
}

/** The look plus whether the player asked for less motion, as the scene needs it. */
export interface SceneLook extends Look {
  reduced: boolean;
}

export const DEFAULT_LOOK: Look = { skin: null, brew: null };

/** The look of one seat's `equipped`. */
export const lookOf = (equipped: Equipped | undefined): Look => ({
  skin: skinOf(equipped),
  brew: brewOf(equipped),
});

/**
 * Which `equipped` the tray draws: the dev override when there is one (only
 * ever set where the lab is on), otherwise the seat's own. The tray belongs to
 * whoever is rolling, so pass the tray player's seat, not the viewer's.
 */
export const resolveEquipped = (
  seat: Equipped | undefined,
  override: Equipped | null,
): Equipped | undefined => override ?? seat;
