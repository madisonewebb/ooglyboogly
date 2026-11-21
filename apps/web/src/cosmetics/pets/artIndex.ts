import { isPetId, type PetId, type PetPose, POSES } from './mood';

export type PetArt = Partial<Record<PetId, Partial<Record<PetPose, string>>>>;

const PATH = /\/pets\/([^/]+)\/([^/.]+)\.webp$/;

/** `.../art/pets/toad/happy.webp` is the toad's happy pose; anything else is not pet art. */
export function parsePetArtPath(path: string): { pet: PetId; pose: PetPose } | null {
  const m = PATH.exec(path);
  const pet = m?.[1];
  const pose = m?.[2];
  if (!isPetId(pet) || !(POSES as readonly string[]).includes(pose ?? '')) return null;
  return { pet, pose: pose as PetPose };
}

/** Builds the lookup from a glob result (file path to URL). */
export function indexPetArt(files: Record<string, string>): PetArt {
  const art: PetArt = {};
  for (const [path, url] of Object.entries(files)) {
    const hit = parsePetArtPath(path);
    if (hit) (art[hit.pet] ??= {})[hit.pose] = url;
  }
  return art;
}

/**
 * Real art, when someone has saved it: apps/web/src/art/pets/<petId>/<pose>.webp.
 * With no such files the glob is empty and every pose is drawn by the placeholders.
 */
export const PET_ART: PetArt = indexPetArt(
  import.meta.glob<string>('../../art/pets/*/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);

export const petArt = (pet: PetId, pose: PetPose, art: PetArt = PET_ART): string | undefined =>
  art[pet]?.[pose];
