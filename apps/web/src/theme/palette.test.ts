import { describe, expect, it } from 'vitest';
import {
  contrast,
  FLAVOR_IDS,
  FLAVORS,
  TEXT_PAIRS,
  type ThemeName,
  THEMES,
  themeCss,
} from './palette';

const AA = 4.5;
const themes = Object.keys(THEMES) as ThemeName[];

describe('contrast()', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBe(1);
    // Measured in the plan: white on bubblegum fails, plum passes.
    expect(contrast('#FFFFFF', '#FF4F9A')).toBeCloseTo(3.07, 2);
    expect(contrast('#3A1E40', '#FF4F9A')).toBeCloseTo(4.75, 2);
  });
});

describe.each(themes)('%s theme', (name) => {
  const t = THEMES[name];

  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(AA);
  });

  it.each(FLAVOR_IDS)('%s ink reads on the pad and the page', (id) => {
    const ink = FLAVORS[id].ink[name];
    expect(contrast(ink, t.pad)).toBeGreaterThanOrEqual(AA);
    expect(contrast(ink, t.bg)).toBeGreaterThanOrEqual(AA);
  });
});

describe('themeCss()', () => {
  it('defines every token for both themes', () => {
    const css = themeCss();
    expect(css).toContain(":root[data-theme='light']{--bg:#FFEEF3;");
    expect(css).toContain('--on-accent:#22122A;');
    expect(css.match(/--quiet:/g)).toHaveLength(2);
  });
});
