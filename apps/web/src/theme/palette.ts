/**
 * The Shoal palette: Sunprint. Cyanotype blue and white, after Anna
 * Atkins' 1843 sunprints of seaweed, with each player writing in a flower or
 * leaf color. This file is the only place colors are defined: the CSS
 * variables are generated from it, and palette.test.ts checks every text
 * pairing against WCAG AA (4.5:1).
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
  /** Quiet text. */
  quiet: string;
  /** Dusty rose, the one accent: Roll, Write it in, Sit down, Start. */
  accent: string;
  /** Text on the accent. */
  onAccent: string;
  /** A developed print: the box you picked, earned bonuses, whose turn it is, focus rings. */
  exposed: string;
  /** Text on an exposed fill. */
  onExposed: string;
  /** Unexposed print paper: a score you could take, still waiting for light. */
  sensitizer: string;
  /** Text on a sensitizer fill. */
  onSensitizer: string;
  /** The band across the top of the table. */
  band: string;
  /** Text on the band. */
  onBand: string;
  /** Porcelain dice. */
  die: string;
  /** Pips. */
  pip: string;
  /** Shadows under raised things (decoration only). */
  shadow: string;
}

export const THEMES: Record<ThemeName, Tokens> = {
  // Day: white paper, Prussian ink.
  light: {
    bg: '#F7F9FA',
    pad: '#FFFFFF',
    rule: '#C9D7E6',
    text: '#102B4C',
    quiet: '#4A6A8F',
    accent: '#E294AB',
    onAccent: '#102B4C',
    exposed: '#1D4A7A',
    onExposed: '#FFFFFF',
    sensitizer: '#D6DC7E',
    onSensitizer: '#102B4C',
    band: '#1D4A7A',
    onBand: '#FFFFFF',
    die: '#F7F9FB',
    pip: '#1D4A7A',
    shadow: '#0B1F38',
  },
  // Evening: the print itself, white on Prussian blue.
  dark: {
    bg: '#10294A',
    pad: '#163760',
    rule: '#2C5583',
    text: '#F1F5FA',
    quiet: '#A6BCD6',
    accent: '#E9A6BA',
    onAccent: '#10294A',
    exposed: '#F1F5FA',
    onExposed: '#10294A',
    sensitizer: '#CFD67E',
    onSensitizer: '#10294A',
    band: '#1B4677',
    onBand: '#F1F5FA',
    die: '#F4F6F9',
    pip: '#1D4A7A',
    shadow: '#030B16',
  },
};

/** The 3D tray's materials: decoration only, never behind text. */
export interface SceneTokens {
  /** The cyanotype-blue felt the dice land on. */
  felt: string;
  /** The limed-oak frame around the felt, like a contact-printing frame. */
  rim: string;
  /** The held-dice shelf and its five seats. */
  shelf: string;
  seat: string;
  /** Inside the glazed cup. */
  cupInside: string;
  /** How bright the studio light is. */
  light: number;
}

export const SCENE: Record<ThemeName, SceneTokens> = {
  light: {
    felt: '#1F4E80',
    rim: '#CDBB9F',
    shelf: '#C2AE90',
    seat: '#A89273',
    cupInside: '#0E2340',
    light: 1,
  },
  dark: {
    felt: '#1A4373',
    rim: '#8E7A60',
    shelf: '#836F57',
    seat: '#6B5944',
    cupInside: '#081A33',
    light: 0.9,
  },
};

export const TINT_IDS = [
  'rose',
  'seaglass',
  'marigold',
  'fern',
  'heather',
  'primrose',
  'poppy',
  'walnut',
] as const;
export type TintId = (typeof TINT_IDS)[number];

export interface Tint {
  name: string;
  /** Avatar rings, swatches and the dice cup. Never text on the pad. */
  hue: string;
  /** Numbers written on the pad, per theme. */
  ink: Record<ThemeName, string>;
}

export const TINTS: Record<TintId, Tint> = {
  rose: { name: 'Rose', hue: '#E0708F', ink: { light: '#CB2C58', dark: '#E5859F' } },
  seaglass: { name: 'Sea glass', hue: '#4FBFAE', ink: { light: '#2C796E', dark: '#4FBFAE' } },
  marigold: { name: 'Marigold', hue: '#EE9A2E', ink: { light: '#9D5E0D', dark: '#EE9A2E' } },
  fern: { name: 'Fern', hue: '#62AE5C', ink: { light: '#41793C', dark: '#69B163' } },
  heather: { name: 'Heather', hue: '#A07BD6', ink: { light: '#8352C9', dark: '#B294DE' } },
  primrose: { name: 'Primrose', hue: '#E6CB45', ink: { light: '#7E6C11', dark: '#E6CB45' } },
  poppy: { name: 'Poppy', hue: '#E8613C', ink: { light: '#C53D17', dark: '#ED8467' } },
  walnut: { name: 'Walnut', hue: '#A0714E', ink: { light: '#8D6445', dark: '#C09A7D' } },
};

/** Every [text, surface] pairing the UI uses. All must reach 4.5:1. */
export const TEXT_PAIRS: [keyof Tokens, keyof Tokens][] = [
  ['text', 'bg'],
  ['text', 'pad'],
  ['quiet', 'bg'],
  ['quiet', 'pad'],
  ['onAccent', 'accent'],
  ['onExposed', 'exposed'],
  ['onSensitizer', 'sensitizer'],
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
