import { describe, expect, it } from 'vitest';
import { assignTint, TINT_IDS, isTint } from './tints';

describe('assignTint', () => {
  it('gives the pick when it is free', () => {
    expect(assignTint(['rose'], 'heather')).toBe('heather');
  });
  it('falls back to the first free tint when the pick is taken', () => {
    expect(assignTint(['heather', 'rose'], 'heather')).toBe('seaglass');
  });
  it('picks the first free tint with no preference', () => {
    expect(assignTint([])).toBe('rose');
  });
  it('never fails, even with every tint taken', () => {
    expect(assignTint(TINT_IDS)).toBe('rose');
  });
});

describe('isTint', () => {
  it('accepts tints and rejects anything else', () => {
    expect(isTint('poppy')).toBe(true);
    expect(isTint('mud')).toBe(false);
    expect(isTint(3)).toBe(false);
  });
});
