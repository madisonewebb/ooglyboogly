import { describe, expect, it } from 'vitest';
import { contrast, TINT_IDS, TINTS, TEXT_PAIRS, type ThemeName, THEMES, themeCss } from './palette';

const AA = 4.5;
const themes = Object.keys(THEMES) as ThemeName[];

describe('contrast()', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBe(1);
    // White on the pink accent fails; plum ink passes.
    expect(contrast('#FFFFFF', '#E88DB2')).toBeLessThan(4.5);
    expect(contrast('#2A2440', '#E88DB2')).toBeCloseTo(6.24, 2);
  });
});

describe.each(themes)('%s theme', (name) => {
  const t = THEMES[name];

  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(AA);
  });

  it.each(TINT_IDS)('%s ink reads on the pad and the page', (id) => {
    const ink = TINTS[id].ink[name];
    expect(contrast(ink, t.pad)).toBeGreaterThanOrEqual(AA);
    expect(contrast(ink, t.bg)).toBeGreaterThanOrEqual(AA);
  });
});

describe('themeCss()', () => {
  it('defines every token for both themes', () => {
    const css = themeCss();
    expect(css).toContain(":root[data-theme='light']{--bg:#F6F3FB;");
    expect(css).toContain('--on-accent:#1D1A2C;');
    expect(css.match(/--quiet:/g)).toHaveLength(2);
  });
});
