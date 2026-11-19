import { describe, expect, it } from 'vitest';
import { assignFlavor, FLAVOR_IDS, isFlavor } from './flavors';

describe('assignFlavor', () => {
  it('gives the pick when it is free', () => {
    expect(assignFlavor(['raspberry'], 'grape')).toBe('grape');
  });
  it('falls back to the first free flavor when the pick is taken', () => {
    expect(assignFlavor(['grape', 'raspberry'], 'grape')).toBe('blueberry');
  });
  it('picks the first free flavor with no preference', () => {
    expect(assignFlavor([])).toBe('raspberry');
  });
  it('never fails, even with every flavor taken', () => {
    expect(assignFlavor(FLAVOR_IDS)).toBe('raspberry');
  });
});

describe('isFlavor', () => {
  it('accepts flavors and rejects anything else', () => {
    expect(isFlavor('cottonCandy')).toBe(true);
    expect(isFlavor('mud')).toBe(false);
    expect(isFlavor(3)).toBe(false);
  });
});
