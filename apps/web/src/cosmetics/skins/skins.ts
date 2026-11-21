import type { Equipped } from '@rollhouse/shared';

/** The dice skins this client can draw; a test keeps this in step with the catalog. */
export const SKIN_IDS = ['bone', 'obsidian', 'moonstone', 'googly', 'gilded'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

/** How a skin looks. Colors are hex; the default porcelain look is not a skin and lives in the theme. */
export interface SkinLook {
  body: string;
  pip: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  /** The body's own glow color and its resting strength (hover adds to it). */
  emissive: string;
  glow: number;
  pipRoughness: number;
  pipMetalness: number;
  /** A canvas texture on the body: ivory grain, or a soft inner glow on each face. */
  texture: 'grain' | 'glow' | null;
  /** Pips are googly eyes that follow the camera and the roll. */
  eyes: boolean;
  /** Pips flare on a Yatzy. */
  glint: boolean;
  /** Needs a slow idle redraw (eyes drift, the glow breathes). */
  idle: boolean;
}

export const SKINS: Record<SkinId, SkinLook> = {
  bone: {
    body: '#EADFC6',
    pip: '#1B1A20',
    roughness: 0.6,
    metalness: 0,
    clearcoat: 0.25,
    emissive: '#EADFC6',
    glow: 0.03,
    pipRoughness: 0.5,
    pipMetalness: 0,
    texture: 'grain',
    eyes: false,
    glint: false,
    idle: false,
  },
  obsidian: {
    body: '#0F0F14',
    pip: '#C9CED8',
    roughness: 0.1,
    metalness: 0.2,
    clearcoat: 1,
    emissive: '#1A1A24',
    glow: 0.05,
    pipRoughness: 0.22,
    pipMetalness: 0.85,
    texture: null,
    eyes: false,
    glint: false,
    idle: false,
  },
  moonstone: {
    body: '#D9E1F0',
    pip: '#3B4684',
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    emissive: '#BFD0FF',
    glow: 0.5,
    pipRoughness: 0.2,
    pipMetalness: 0,
    texture: 'glow',
    eyes: false,
    glint: false,
    idle: true,
  },
  googly: {
    body: '#4B3A5E',
    pip: '#FFFFFF',
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.3,
    emissive: '#4B3A5E',
    glow: 0.05,
    pipRoughness: 0.12,
    pipMetalness: 0,
    texture: null,
    eyes: true,
    glint: false,
    idle: true,
  },
  gilded: {
    body: '#CFA13A',
    pip: '#45300B',
    roughness: 0.3,
    metalness: 1,
    clearcoat: 0.6,
    emissive: '#CFA13A',
    glow: 0.03,
    pipRoughness: 0.35,
    pipMetalness: 0.5,
    texture: null,
    eyes: false,
    glint: true,
    idle: false,
  },
};

export const isSkinId = (v: unknown): v is SkinId =>
  typeof v === 'string' && (SKIN_IDS as readonly string[]).includes(v);

/** The skin a seat has on, or null for the default porcelain (nothing equipped, or an id this client does not know). */
export const skinOf = (equipped: Equipped | undefined): SkinId | null => {
  const id = equipped?.diceSkin;
  return isSkinId(id) ? id : null;
};
