import { TINT_IDS, type TintId } from '@rollhouse/shared';

/**
 * The Rollhouse palette: Lavender evening. Dark plum with lavender and a pink
 * accent for the evening calls it's mostly played on, and a lavender daytime
 * version. Each player writes in a flower or leaf color. This file is the
 * only place colors are defined: the CSS variables are generated from it, and
 * palette.test.ts checks every text pairing against WCAG AA (4.5:1).
 */

export type ThemeName = 'light' | 'dark';

/** The overall color scheme, chosen in settings. Lavender is the original. */
export const SCHEME_IDS = ['lavender', 'ocean', 'moss'] as const;
export type SchemeId = (typeof SCHEME_IDS)[number];
export const DEFAULT_SCHEME: SchemeId = 'lavender';
export const isScheme = (v: unknown): v is SchemeId =>
  (SCHEME_IDS as readonly unknown[]).includes(v);

export interface Tokens {
  /** Page background. */
  bg: string;
  /** The score pad and panels. */
  pad: string;
  /** Pad rules and borders (decoration only, never text). */
  rule: string;
  text: string;
  /** Quiet text. */
  quiet: string;
  /** Pink, the one accent: Roll, Write it in, Sit down, Start. */
  accent: string;
  /** Text on the accent. */
  onAccent: string;
  /** Lavender: the box you picked, earned bonuses, whose turn it is, selections, focus rings. */
  strong: string;
  /** Text on a strong fill. */
  onStrong: string;
  /** A soft fill for a score you could take. */
  option: string;
  /** Text on an option fill. */
  onOption: string;
  /** The band across the top of the table, and the name plates. */
  band: string;
  /** Text on the band. */
  onBand: string;
  /** Dice. */
  die: string;
  /** Pips. */
  pip: string;
  /** Shadows under raised things (decoration only). */
  shadow: string;
}

const LAVENDER: Record<ThemeName, Tokens> = {
  // Daytime: pale lavender and white, plum ink.
  light: {
    bg: '#F6F3FB',
    pad: '#FFFFFF',
    rule: '#E1DAF0',
    text: '#2A2440',
    quiet: '#675F84',
    accent: '#E88DB2',
    onAccent: '#2A2440',
    strong: '#6B55C8',
    onStrong: '#FFFFFF',
    option: '#ECE6FA',
    onOption: '#2A2440',
    band: '#2A2440',
    onBand: '#F4F1FA',
    die: '#FFFFFF',
    pip: '#5B47B0',
    shadow: '#1A1530',
  },
  // Evening: dark plum, lavender and pink.
  dark: {
    bg: '#1D1A2C',
    pad: '#29253D',
    rule: '#3D3757',
    text: '#F4F1FA',
    quiet: '#B6AED0',
    accent: '#F2A7C3',
    onAccent: '#1D1A2C',
    strong: '#BBA9F3',
    onStrong: '#1D1A2C',
    option: '#463F6C',
    onOption: '#F4F1FA',
    band: '#151321',
    onBand: '#F4F1FA',
    die: '#F7F5FB',
    pip: '#5B47B0',
    shadow: '#05040A',
  },
};

/** The 3D tray's materials: decoration only, never behind text. */
export interface SceneTokens {
  /** The felt the dice land on. */
  felt: string;
  /** The lacquered frame around the felt. */
  rim: string;
  /** The held-dice shelf and its five seats. */
  shelf: string;
  seat: string;
  /** Inside the cup. */
  cupInside: string;
  /** How bright the studio light is. */
  light: number;
}

const LAVENDER_SCENE: Record<ThemeName, SceneTokens> = {
  light: {
    felt: '#5D4FA3',
    rim: '#E6E0F3',
    shelf: '#D9D0EE',
    seat: '#C5B9E4',
    cupInside: '#2A2440',
    light: 1,
  },
  dark: {
    felt: '#3A3263',
    rim: '#4E4774',
    shelf: '#453E69',
    seat: '#38325A',
    cupInside: '#151321',
    light: 0.9,
  },
};

const OCEAN: Record<ThemeName, Tokens> = {
  light: {
    bg: '#F0F6F9',
    pad: '#FFFFFF',
    rule: '#D3E3EA',
    text: '#17303D',
    quiet: '#4F6877',
    accent: '#F2A38C',
    onAccent: '#17303D',
    strong: '#1F6E9C',
    onStrong: '#FFFFFF',
    option: '#DDEEF5',
    onOption: '#17303D',
    band: '#17303D',
    onBand: '#EFF6F9',
    die: '#FFFFFF',
    pip: '#1F6E9C',
    shadow: '#0B1A22',
  },
  dark: {
    bg: '#0D1A22',
    pad: '#142631',
    rule: '#2D4858',
    text: '#EAF4F8',
    quiet: '#A5C0CE',
    accent: '#F4B29E',
    onAccent: '#10212B',
    strong: '#8CCBEB',
    onStrong: '#10212B',
    option: '#2C5468',
    onOption: '#EAF4F8',
    band: '#0A1820',
    onBand: '#EAF4F8',
    die: '#F4F8FA',
    pip: '#1F6E9C',
    shadow: '#03080B',
  },
};

const OCEAN_SCENE: Record<ThemeName, SceneTokens> = {
  light: {
    felt: '#2F6F8F',
    rim: '#DCEAF1',
    shelf: '#C9DDE8',
    seat: '#B2CEDD',
    cupInside: '#17303D',
    light: 1,
  },
  dark: {
    felt: '#235068',
    rim: '#35617A',
    shelf: '#2F5870',
    seat: '#274A5F',
    cupInside: '#0A1820',
    light: 0.9,
  },
};

const MOSS: Record<ThemeName, Tokens> = {
  light: {
    bg: '#F3F6EF',
    pad: '#FFFFFF',
    rule: '#DCE5D3',
    text: '#25301F',
    quiet: '#5B6A52',
    accent: '#E8A05A',
    onAccent: '#25301F',
    strong: '#3F7A3A',
    onStrong: '#FFFFFF',
    option: '#E4EEDB',
    onOption: '#25301F',
    band: '#25301F',
    onBand: '#F3F6EF',
    die: '#FFFFFF',
    pip: '#3F7A3A',
    shadow: '#141B10',
  },
  dark: {
    bg: '#171F15',
    pad: '#212B1E',
    rule: '#37462F',
    text: '#EFF5EA',
    quiet: '#B1C3A6',
    accent: '#F0B87A',
    onAccent: '#171F15',
    strong: '#A5D79A',
    onStrong: '#171F15',
    option: '#3B5233',
    onOption: '#EFF5EA',
    band: '#0F150E',
    onBand: '#EFF5EA',
    die: '#F6F8F3',
    pip: '#3F7A3A',
    shadow: '#040603',
  },
};

const MOSS_SCENE: Record<ThemeName, SceneTokens> = {
  light: {
    felt: '#4B7A47',
    rim: '#E1EADA',
    shelf: '#D0DEC6',
    seat: '#BCD0AE',
    cupInside: '#25301F',
    light: 1,
  },
  dark: {
    felt: '#35542F',
    rim: '#46623F',
    shelf: '#3E5A37',
    seat: '#334C2D',
    cupInside: '#0F150E',
    light: 0.9,
  },
};

export const SCHEMES: Record<
  SchemeId,
  { name: string; themes: Record<ThemeName, Tokens>; scene: Record<ThemeName, SceneTokens> }
> = {
  lavender: { name: 'Lavender', themes: LAVENDER, scene: LAVENDER_SCENE },
  ocean: { name: 'Ocean', themes: OCEAN, scene: OCEAN_SCENE },
  moss: { name: 'Moss', themes: MOSS, scene: MOSS_SCENE },
};

/** The original lavender scheme. */
export const THEMES = LAVENDER;
export const SCENE = LAVENDER_SCENE;

export { TINT_IDS, type TintId };

export interface Tint {
  name: string;
  /** Avatar rings, swatches and the dice cup. Never text on the pad. */
  hue: string;
  /** Numbers written on the pad, per theme. */
  ink: Record<ThemeName, string>;
}

export const TINTS: Record<TintId, Tint> = {
  rose: { name: 'Rose', hue: '#E0708F', ink: { light: '#CD2C59', dark: '#E0708F' } },
  seaglass: { name: 'Sea glass', hue: '#4FBFAE', ink: { light: '#2C796E', dark: '#4FBFAE' } },
  marigold: { name: 'Marigold', hue: '#EE9A2E', ink: { light: '#9F5F0D', dark: '#EE9A2E' } },
  fern: { name: 'Fern', hue: '#62AE5C', ink: { light: '#427B3D', dark: '#62AE5C' } },
  heather: { name: 'Heather', hue: '#A07BD6', ink: { light: '#8454CA', dark: '#A37FD7' } },
  primrose: { name: 'Primrose', hue: '#E6CB45', ink: { light: '#7E6C11', dark: '#E6CB45' } },
  poppy: { name: 'Poppy', hue: '#E8613C', ink: { light: '#C83D18', dark: '#E96A47' } },
  walnut: { name: 'Walnut', hue: '#A0714E', ink: { light: '#8F6546', dark: '#B48765' } },
  cornflower: { name: 'Cornflower', hue: '#5B8DEF', ink: { light: '#2F5FC4', dark: '#6F9BF0' } },
  orchid: { name: 'Orchid', hue: '#C055B8', ink: { light: '#A02E98', dark: '#CF6FC8' } },
};

/** Every [text, surface] pairing the UI uses. All must reach 4.5:1. */
export const TEXT_PAIRS: [keyof Tokens, keyof Tokens][] = [
  ['text', 'bg'],
  ['text', 'pad'],
  ['quiet', 'bg'],
  ['quiet', 'pad'],
  ['onAccent', 'accent'],
  ['onStrong', 'strong'],
  ['onOption', 'option'],
  ['onBand', 'band'],
];

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #RRGGBB color. */
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two #RRGGBB colors. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** The CSS variables for every scheme and theme, keyed on <html data-scheme data-theme>. Lavender needs no data-scheme. */
export function themeCss(): string {
  return SCHEME_IDS.flatMap((id) =>
    (Object.keys(THEMES) as ThemeName[]).map((name) => {
      const vars = Object.entries(SCHEMES[id].themes[name])
        .map(([k, v]) => `--${kebab(k)}:${v};`)
        .join('');
      const scheme = id === DEFAULT_SCHEME ? '' : `[data-scheme='${id}']`;
      return `:root${scheme}[data-theme='${name}']{${vars}color-scheme:${name};}`;
    }),
  ).join('\n');
}
