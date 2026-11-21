/**
 * Everything a tank can hold, with the prices the shop will charge. Prices and
 * names live here in code, versioned with the art; a saved tank stores only ids.
 */

export type FishId = 'neonTetra' | 'pandaCory' | 'betta' | 'cherryShrimp';
export type PlantId =
  'vallisneria' | 'rotala' | 'javaFern' | 'anubias' | 'moss' | 'carpet' | 'frogbit';
export type DecorId = 'driftwood' | 'stone' | 'teapot';

export interface CatalogEntry {
  name: string;
  /** In plural for a group, as the tank describes itself to screen readers. */
  plural: string;
  price: number;
}

export interface FishEntry extends CatalogEntry {
  /** Body length in world units at the front glass. */
  length: number;
  /** Where it lives: in a school mid-water, on the bottom, near the top, or on surfaces. */
  zone: 'school' | 'bottom' | 'upper' | 'surface';
}

export const FISH: Record<FishId, FishEntry> = {
  neonTetra: {
    name: 'Neon tetra',
    plural: 'neon tetras',
    price: 40,
    length: 40,
    zone: 'school',
  },
  pandaCory: {
    name: 'Panda corydoras',
    plural: 'panda corydoras',
    price: 60,
    length: 46,
    zone: 'bottom',
  },
  betta: { name: 'Betta', plural: 'bettas', price: 180, length: 50, zone: 'upper' },
  cherryShrimp: {
    name: 'Cherry shrimp',
    plural: 'cherry shrimp',
    price: 25,
    length: 20,
    zone: 'surface',
  },
};

export const PLANTS: Record<PlantId, CatalogEntry> = {
  vallisneria: { name: 'Vallisneria', plural: 'vallisneria', price: 50 },
  rotala: { name: 'Rotala', plural: 'rotala', price: 60 },
  javaFern: { name: 'Java fern', plural: 'java ferns', price: 70 },
  anubias: { name: 'Anubias', plural: 'anubias', price: 80 },
  moss: { name: 'Christmas moss', plural: 'moss', price: 40 },
  carpet: { name: 'Monte Carlo carpet', plural: 'carpet plants', price: 90 },
  frogbit: { name: 'Frogbit', plural: 'frogbit', price: 30 },
};

export const DECOR: Record<DecorId, CatalogEntry> = {
  driftwood: { name: 'Spiderwood', plural: 'driftwood', price: 120 },
  stone: { name: 'Seiryu stone', plural: 'stones', price: 60 },
  teapot: { name: 'Porcelain teapot', plural: 'teapots', price: 150 },
};

/** Something placed in the tank. Fish are listed by count; they choose where to swim. */
export interface TankItem {
  kind: 'plant' | 'decor';
  id: PlantId | DecorId;
  /** Across the tank, 0 to 1000. */
  x: number;
  /** Depth, 0 at the back glass to 1 at the front. */
  z: number;
  /** Drawn from this seed, so every screen grows the same plant. */
  seed: number;
  /** Optional size, 1 is normal. */
  size?: number;
  /** Height above the sand, for plants tied to wood or stone. */
  lift?: number;
}

export interface TankLayout {
  items: TankItem[];
  fish: { id: FishId; count: number }[];
}

/** A few fish and plants: what every player starts with. */
export const STARTER: TankLayout = {
  items: [
    { kind: 'plant', id: 'vallisneria', x: 170, z: 0.08, seed: 3 },
    { kind: 'plant', id: 'vallisneria', x: 820, z: 0.1, seed: 9, size: 0.9 },
    { kind: 'decor', id: 'stone', x: 600, z: 0.45, seed: 4 },
    { kind: 'plant', id: 'javaFern', x: 585, z: 0.42, seed: 5, lift: 36 },
    { kind: 'plant', id: 'carpet', x: 380, z: 0.86, seed: 6, size: 1.2 },
  ],
  fish: [
    { id: 'neonTetra', count: 7 },
    { id: 'pandaCory', count: 2 },
  ],
};

/** A full aquascape, to see everything the shop will sell. */
export const SHOWCASE: TankLayout = {
  items: [
    { kind: 'plant', id: 'vallisneria', x: 90, z: 0.06, seed: 3, size: 1.1 },
    { kind: 'plant', id: 'vallisneria', x: 250, z: 0.04, seed: 8 },
    { kind: 'plant', id: 'rotala', x: 860, z: 0.1, seed: 11 },
    { kind: 'plant', id: 'rotala', x: 930, z: 0.16, seed: 12, size: 0.85 },
    { kind: 'plant', id: 'vallisneria', x: 760, z: 0.05, seed: 21, size: 0.95 },
    { kind: 'decor', id: 'driftwood', x: 420, z: 0.35, seed: 7, size: 1.1 },
    { kind: 'plant', id: 'moss', x: 395, z: 0.37, seed: 13, lift: 14 },
    { kind: 'plant', id: 'javaFern', x: 520, z: 0.4, seed: 5, lift: 52 },
    { kind: 'decor', id: 'stone', x: 640, z: 0.5, seed: 4, size: 1.15 },
    { kind: 'decor', id: 'stone', x: 712, z: 0.62, seed: 14, size: 0.7 },
    { kind: 'plant', id: 'anubias', x: 650, z: 0.55, seed: 15, lift: 40 },
    { kind: 'decor', id: 'teapot', x: 200, z: 0.72, seed: 16 },
    { kind: 'plant', id: 'carpet', x: 470, z: 0.88, seed: 6, size: 1.6 },
    { kind: 'plant', id: 'carpet', x: 820, z: 0.82, seed: 17, size: 1 },
    { kind: 'plant', id: 'frogbit', x: 300, z: 0.5, seed: 18 },
    { kind: 'plant', id: 'frogbit', x: 690, z: 0.4, seed: 19, size: 0.8 },
  ],
  fish: [
    { id: 'neonTetra', count: 11 },
    { id: 'pandaCory', count: 3 },
    { id: 'betta', count: 1 },
    { id: 'cherryShrimp', count: 6 },
  ],
};

/** "6 neon tetras, 2 panda corydoras, vallisneria and a stone": for screen readers. */
export function describe(layout: TankLayout): string {
  const fish = layout.fish
    .filter((f) => f.count > 0)
    .map((f) => `${f.count} ${f.count === 1 ? FISH[f.id].name.toLowerCase() : FISH[f.id].plural}`);
  const things = [
    ...new Set(
      layout.items.map((i) =>
        i.kind === 'plant' ? PLANTS[i.id as PlantId].plural : DECOR[i.id as DecorId].plural,
      ),
    ),
  ];
  const all = [...fish, ...things];
  if (all.length === 0) return 'an empty tank';
  return all.length === 1 ? all[0]! : `${all.slice(0, -1).join(', ')} and ${all.at(-1)}`;
}
