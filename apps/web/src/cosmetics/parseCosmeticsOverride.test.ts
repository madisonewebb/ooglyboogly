import { describe, expect, it } from 'vitest';
import { parseCosmeticsOverride } from './parseCosmeticsOverride';

describe('parseCosmeticsOverride', () => {
  it('reads slot:id pairs', () => {
    expect(parseCosmeticsOverride('?cosmetics=diceSkin:gilded,brew:witchfire')).toEqual({
      diceSkin: 'gilded',
      brew: 'witchfire',
    });
  });

  it('works next to other parameters and ignores spaces', () => {
    expect(parseCosmeticsOverride('?lab&cosmetics=brew: swamp ,x=1')).toEqual({ brew: 'swamp' });
  });

  it('gives nothing when absent or empty', () => {
    expect(parseCosmeticsOverride('')).toEqual({});
    expect(parseCosmeticsOverride('?lab')).toEqual({});
    expect(parseCosmeticsOverride('?cosmetics=')).toEqual({});
  });

  it('drops unknown slots, unknown ids and ids in the wrong slot', () => {
    expect(parseCosmeticsOverride('?cosmetics=hat:bone,diceSkin:nope,brew:bone,diceSkin')).toEqual(
      {},
    );
  });

  it('keeps the first valid value of a repeated slot', () => {
    expect(parseCosmeticsOverride('?cosmetics=brew:swamp,brew:starwater')).toEqual({
      brew: 'swamp',
    });
  });

  it('accepts a celebration too', () => {
    expect(parseCosmeticsOverride('?cosmetics=celebration:ghostParade')).toEqual({
      celebration: 'ghostParade',
    });
  });

  it('accepts the avatar slots', () => {
    expect(
      parseCosmeticsOverride('?cosmetics=hat:crown,face:monocle,held:wand,aura:sparkles'),
    ).toEqual({
      hat: 'crown',
      face: 'monocle',
      held: 'wand',
      aura: 'sparkles',
    });
  });

  it('skips malformed pairs and wrong-slot ids, then reads the next valid one', () => {
    expect(
      parseCosmeticsOverride('?cosmetics=hat:toad,brew:ghostParade,brew,:,brew:swamp'),
    ).toEqual({
      brew: 'swamp',
    });
  });
});
