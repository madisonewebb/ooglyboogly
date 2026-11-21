import type { Equipped } from '@rollhouse/shared';

/** The brews this client can draw; a test keeps this in step with the catalog. */
export const BREW_IDS = ['swamp', 'violetMurk', 'witchfire', 'starwater'] as const;
export type BrewId = (typeof BREW_IDS)[number];

/** One layer of rising particles in the cauldron. */
export interface ParticleLayer {
  shape: 'bubble' | 'puff' | 'flame' | 'glitter';
  count: number;
  color: string;
  /** Hotter core color for flames. */
  core?: string;
  /** Particle size in world units. */
  size: number;
  /** How far a particle rises before it fades, and how many lives it lives per second. */
  rise: number;
  speed: number;
  alpha: number;
  /** How much a particle grows over its life (smoke puffs swell). */
  grow: number;
  /** Where it starts: inside the surface, or around the rim. */
  from: 'surface' | 'rim';
}

export interface BrewLook {
  /** The liquid's colors: base, a lighter mottle, and its glow. */
  liquid: string;
  mottle: string;
  glow: string;
  glowStrength: number;
  /** Little bright specks in the liquid (starwater). */
  specks: boolean;
  layers: ParticleLayer[];
  /** A comet shoots out on a Yatzy. */
  comet: boolean;
}

export const BREWS: Record<BrewId, BrewLook> = {
  swamp: {
    liquid: '#46602A',
    mottle: '#6F8A3F',
    glow: '#3E5A22',
    glowStrength: 0.35,
    specks: false,
    layers: [
      {
        shape: 'bubble',
        count: 9,
        color: '#B5D88C',
        size: 0.26,
        rise: 0.45,
        speed: 0.16,
        alpha: 0.9,
        grow: 1.2,
        from: 'surface',
      },
    ],
    comet: false,
  },
  violetMurk: {
    liquid: '#3B2058',
    mottle: '#5E3A8A',
    glow: '#4A2A70',
    glowStrength: 0.4,
    specks: false,
    layers: [
      {
        shape: 'puff',
        count: 7,
        color: '#9B73C9',
        size: 0.85,
        rise: 1.1,
        speed: 0.09,
        alpha: 0.32,
        grow: 2.2,
        from: 'surface',
      },
    ],
    comet: false,
  },
  witchfire: {
    liquid: '#14301F',
    mottle: '#1F5A36',
    glow: '#2BD46A',
    glowStrength: 0.55,
    specks: false,
    layers: [
      {
        shape: 'flame',
        count: 14,
        color: '#2FD96A',
        core: '#E6FFB0',
        size: 0.7,
        rise: 0.55,
        speed: 0.85,
        alpha: 0.95,
        grow: 0.6,
        from: 'rim',
      },
    ],
    comet: false,
  },
  starwater: {
    liquid: '#1A1F52',
    mottle: '#32408C',
    glow: '#4A5CC8',
    glowStrength: 0.5,
    specks: true,
    layers: [
      {
        shape: 'glitter',
        count: 16,
        color: '#FFE9A8',
        size: 0.34,
        rise: 0.8,
        speed: 0.22,
        alpha: 0.95,
        grow: 1,
        from: 'surface',
      },
      {
        shape: 'bubble',
        count: 6,
        color: '#B8C6FF',
        size: 0.22,
        rise: 0.5,
        speed: 0.14,
        alpha: 0.8,
        grow: 1.1,
        from: 'surface',
      },
    ],
    comet: true,
  },
};

export const isBrewId = (v: unknown): v is BrewId =>
  typeof v === 'string' && (BREW_IDS as readonly string[]).includes(v);

/** The brew a seat has on, or null for the empty cauldron of today. */
export const brewOf = (equipped: Equipped | undefined): BrewId | null => {
  const id = equipped?.brew;
  return isBrewId(id) ? id : null;
};
