import { petArt } from './artIndex';
import type { PetArt } from './artIndex';
import { type PetId, type PetPose, poseFor } from './mood';
import { PlaceholderSprite } from './placeholders';

/**
 * One pet in one pose: the real image when its file exists in
 * apps/web/src/art/pets/<pet>/<pose>.webp, otherwise the drawn placeholder.
 * A pose a pet has no art for (a cheer for a toad) is shown as happy.
 */
export function PetSprite({
  pet,
  pose,
  art,
}: {
  pet: PetId;
  pose: PetPose;
  /** Overridable for tests; the real lookup by default. */
  art?: PetArt;
}) {
  const shown = poseFor(pet, pose);
  const url = art ? petArt(pet, shown, art) : petArt(pet, shown);
  return url ? (
    <img className="pet-img" src={url} alt="" draggable={false} />
  ) : (
    <PlaceholderSprite pet={pet} pose={shown} />
  );
}
