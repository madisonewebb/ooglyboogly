import type { Equipped } from '@rollhouse/shared';

/** The avatar items this client can draw; a test keeps these in step with the catalog. */
export const HAIR_IDS = ['bob', 'pigtails', 'spaceBuns', 'longWaves'] as const;
export const HAT_IDS = ['partyHat', 'bow', 'witchHat', 'crown'] as const;
export const FACE_IDS = ['glasses', 'mustache', 'monocle', 'eyepatch'] as const;
export const HELD_IDS = ['wand', 'lantern', 'cauldron', 'crystalBall'] as const;
export const AURA_IDS = ['sparkles', 'candleFlame', 'orbitingStars'] as const;

export type HairId = (typeof HAIR_IDS)[number];

/** Each style's own color, shared by the 3D model and the flat fallback. */
export const HAIR_COLOR: Record<HairId, string> = {
  bob: '#5A382B',
  pigtails: '#D9A94E',
  spaceBuns: '#2E2640',
  longWaves: '#A4492E',
};
export type HatId = (typeof HAT_IDS)[number];
export type FaceId = (typeof FACE_IDS)[number];
export type HeldId = (typeof HELD_IDS)[number];
export type AuraId = (typeof AURA_IDS)[number];

/** What one avatar wears: null means nothing in that slot, the bare blob. */
export interface AvatarLook {
  hair: HairId | null;
  hat: HatId | null;
  face: FaceId | null;
  held: HeldId | null;
  aura: AuraId | null;
}

export const BARE_LOOK: AvatarLook = { hair: null, hat: null, face: null, held: null, aura: null };

const pick = <T extends string>(ids: readonly T[], v: unknown): T | null =>
  typeof v === 'string' && (ids as readonly string[]).includes(v) ? (v as T) : null;

/** The avatar look of one seat's `equipped`. Unknown or misplaced ids are ignored. */
export const avatarLookOf = (equipped: Equipped | undefined): AvatarLook => ({
  hair: pick(HAIR_IDS, equipped?.hair),
  hat: pick(HAT_IDS, equipped?.hat),
  face: pick(FACE_IDS, equipped?.face),
  held: pick(HELD_IDS, equipped?.held),
  aura: pick(AURA_IDS, equipped?.aura),
});

/** A stable string for a look, to tell whether the avatar needs rebuilding. */
export const lookKey = (l: AvatarLook): string =>
  `${l.hair ?? '-'}|${l.hat ?? '-'}|${l.face ?? '-'}|${l.held ?? '-'}|${l.aura ?? '-'}`;
