import { describe, expect, it } from 'vitest';
import { parseCosmeticsOverride } from './parseCosmeticsOverride';

describe('parseCosmeticsOverride', () => {
  it('reads slot:id pairs', () => {
    expect(parseCosmeticsOverride('?cosmetics=pet:toad,celebration:ghostParade')).toEqual({
      pet: 'toad',
      celebration: 'ghostParade',
    });
  });

  it('ignores unknown slots, wrong-slot ids and malformed pairs', () => {
    expect(parseCosmeticsOverride('?cosmetics=hat:toad,pet:ghostParade,pet,:,pet:bat')).toEqual({
      pet: 'bat',
    });
  });

  it('is empty without the parameter', () => {
    expect(parseCosmeticsOverride('')).toEqual({});
    expect(parseCosmeticsOverride('?lab=1')).toEqual({});
  });
});
