/**
 * The Rollhouse palette, from the plan's visual direction. This file is the only
 * place colors are defined: the CSS variables are generated from it, and
 * palette.test.ts checks every text pairing against WCAG AA (4.5:1).
 */

export type ThemeName = 'light' | 'dark';

export interface Tokens {
  /** Page background. */
  bg: string;
  /** The score pad and panels. */
  pad: string;
  /** Pad rules and borders (decoration only, never text). */
  rule: string;
  text: string;
  /** Quiet text and score previews. */
  quiet: string;
  /** Roll button, your turn, the chosen box. */
  accent: string;
  /** Text on the accent. */
  onAccent: string;
  /** Held dice shelf and new records (fills only). */
  butter: string;
  /** Success and bonuses (fills only). */
  mint: string;
  /** Text on butter and mint fills. */
  onFill: string;
  /** Jelly dice body. */
  die: string;
  /** Pips. */
  pip: string;
}

export const THEMES: Record<ThemeName, Tokens> = {
  // Strawberry Milk
  light: {
    bg: '#FFEEF3',
    pad: '#FFFFFF',
    rule: '#DCCBF5',
    text: '#3A1E40',
    quiet: '#806386',
    accent: '#FF4F9A',
    onAccent: '#3A1E40',
    butter: '#FFD25E',
    mint: '#3FC6A4',
    onFill: '#3A1E40',
    die: '#FF4F9A',
    pip: '#FFFFFF',
  },
  // Midnight Plum
  dark: {
    bg: '#22122A',
    pad: '#321D3D',
    rule: '#57406A',
    text: '#FBEFF5',
    quiet: '#A891B3',
    accent: '#FF72B0',
    onAccent: '#22122A',
    butter: '#FFD86E',
    mint: '#5FE0BE',
    onFill: '#22122A',
    die: '#FF4F9A',
    pip: '#FFFFFF',
  },
};

export const FLAVOR_IDS = [
  'raspberry',
  'blueberry',
  'tangerine',
  'spearmint',
  'grape',
  'lemon',
  'cottonCandy',
  'cocoa',
] as const;
export type FlavorId = (typeof FLAVOR_IDS)[number];

export interface Flavor {
  name: string;
  /** Avatar chips, score pops, sprinkles. Never text on the pad. */
  candy: string;
  /** Numbers written on the pad, per theme. */
  ink: Record<ThemeName, string>;
}

export const FLAVORS: Record<FlavorId, Flavor> = {
  raspberry: { name: 'Raspberry', candy: '#E0337A', ink: { light: '#CE1F67', dark: '#E65D95' } },
  blueberry: { name: 'Blueberry', candy: '#4A6CF7', ink: { light: '#365CF6', dark: '#6A86F8' } },
  tangerine: { name: 'Tangerine', candy: '#F28C28', ink: { light: '#A7580A', dark: '#F28C28' } },
  spearmint: { name: 'Spearmint', candy: '#1FA884', ink: { light: '#177B60', dark: '#1FA884' } },
  grape: { name: 'Grape', candy: '#8B4FD8', ink: { light: '#884BD7', dark: '#A779E1' } },
  lemon: { name: 'Lemon', candy: '#D4A106', ink: { light: '#876704', dark: '#D4A106' } },
  cottonCandy: {
    name: 'Cotton Candy',
    candy: '#2BB3E6',
    ink: { light: '#127499', dark: '#2BB3E6' },
  },
  cocoa: { name: 'Cocoa', candy: '#8B5A3C', ink: { light: '#8B5A3C', dark: '#BA815F' } },
};

/** Every [text, surface] pairing the UI uses. All must reach 4.5:1. */
export const TEXT_PAIRS: [keyof Tokens, keyof Tokens][] = [
  ['text', 'bg'],
  ['text', 'pad'],
  ['quiet', 'bg'],
  ['quiet', 'pad'],
  ['onAccent', 'accent'],
  ['onFill', 'butter'],
  ['onFill', 'mint'],
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

/** The CSS variables for both themes, keyed on <html data-theme>. */
export function themeCss(): string {
  return (Object.keys(THEMES) as ThemeName[])
    .map((name) => {
      const vars = Object.entries(THEMES[name])
        .map(([k, v]) => `--${kebab(k)}:${v};`)
        .join('');
      return `:root[data-theme='${name}']{${vars}color-scheme:${name};}`;
    })
    .join('\n');
}
