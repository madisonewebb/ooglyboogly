import { describe, expect, it } from 'vitest';
import { cardOptions } from './options';
import { card, d } from './test-helpers';
import { BOXES, type Box, LOWER_BOXES, UPPER_BOXES } from './types';

const allowed = (o: ReturnType<typeof cardOptions>) =>
  o.options.filter((x) => x.allowed).map((x) => x.box);
const value = (o: ReturnType<typeof cardOptions>, box: Box) =>
  o.options.find((x) => x.box === box)?.value;
/** Every box filled except the ones listed. */
const onlyOpen = (...open: Box[]) =>
  Object.fromEntries(BOXES.filter((b) => !open.includes(b)).map((b) => [b, 0]));

describe('cardOptions without a joker', () => {
  it('allows every open box at its standard value', () => {
    const o = cardOptions(card(), d('33322'));
    expect(allowed(o)).toEqual([...BOXES]);
    expect(value(o, 'fullHouse')).toBe(25);
    expect(value(o, 'threes')).toBe(9);
    expect(o.joker).toBe(false);
    expect(o.bonus).toBe(false);
  });

  it('leaves filled boxes out', () => {
    const o = cardOptions(card({ chance: 20, ones: 3 }), d('12345'));
    expect(o.options.map((x) => x.box)).not.toContain('chance');
    expect(o.options.map((x) => x.box)).not.toContain('ones');
  });

  it('scores a Yatzy normally while this card’s Yatzy box is open', () => {
    const o = cardOptions(card({ fours: 12 }), d('44444'));
    expect(o.joker).toBe(false);
    expect(value(o, 'yatzy')).toBe(50);
    expect(value(o, 'fullHouse')).toBe(0); // no joker, so no full house
    expect(allowed(o)).toContain('chance');
  });
});

describe('joker rules (Yatzy box filled on this card)', () => {
  it('forces the matching upper box when open, with the bonus after a 50', () => {
    const o = cardOptions(card({ yatzy: 50 }), d('44444'));
    expect(o.joker).toBe(true);
    expect(o.bonus).toBe(true);
    expect(allowed(o)).toEqual(['fours']);
    expect(value(o, 'fours')).toBe(20);
    expect(value(o, 'chance')).toBe(0);
  });

  it('applies the joker but no bonus after a 0', () => {
    const o = cardOptions(card({ yatzy: 0 }), d('22222'));
    expect(o.joker).toBe(true);
    expect(o.bonus).toBe(false);
    expect(allowed(o)).toEqual(['twos']);
  });

  it('opens every open lower box at full value when the matching upper box is filled', () => {
    const o = cardOptions(card({ yatzy: 50, sixes: 24 }), d('66666'));
    expect(allowed(o)).toEqual(LOWER_BOXES.filter((b) => b !== 'yatzy'));
    expect(value(o, 'fullHouse')).toBe(25);
    expect(value(o, 'smallStraight')).toBe(30);
    expect(value(o, 'largeStraight')).toBe(40);
    expect(value(o, 'threeKind')).toBe(30);
    expect(value(o, 'fourKind')).toBe(30);
    expect(value(o, 'chance')).toBe(30);
    // Upper boxes are not allowed while a lower box is open.
    expect(allowed(o)).not.toContain('ones');
    expect(value(o, 'ones')).toBe(0);
  });

  it('allows only the lower boxes that are still open', () => {
    const o = cardOptions(card({ yatzy: 0, ones: 3, largeStraight: 40, chance: 22 }), d('11111'));
    expect(allowed(o)).toEqual(['threeKind', 'fourKind', 'fullHouse', 'smallStraight']);
  });

  it('falls back to a 0 in any open upper box when every lower box is filled', () => {
    const c = card({ ...onlyOpen('twos', 'fives', 'threes') });
    const o = cardOptions(c, d('33333'));
    // The matching upper box (threes) is open, so it is forced first.
    expect(allowed(o)).toEqual(['threes']);
    expect(value(o, 'threes')).toBe(15);

    const o2 = cardOptions(card({ ...onlyOpen('twos', 'fives') }), d('33333'));
    expect(allowed(o2)).toEqual(['twos', 'fives']);
    expect(value(o2, 'twos')).toBe(0);
    expect(value(o2, 'fives')).toBe(0);
  });

  it('earns at most three bonuses per card, then still plays as a joker', () => {
    const third = cardOptions(card({ yatzy: 50 }, 2), d('33333'));
    expect(third.bonus).toBe(true);
    const fourth = cardOptions(card({ yatzy: 50 }, 3), d('33333'));
    expect(fourth.bonus).toBe(false);
    expect(fourth.joker).toBe(true);
    expect(allowed(fourth)).toEqual(['threes']);
  });

  it('still earns the bonus when forced into a 0', () => {
    const c = card({ ...onlyOpen('ones'), yatzy: 50 });
    const o = cardOptions(c, d('66666'));
    expect(allowed(o)).toEqual(['ones']);
    expect(value(o, 'ones')).toBe(0);
    expect(o.bonus).toBe(true);
  });

  it('treats upper boxes as the only category when they are all that is left', () => {
    const o = cardOptions(
      card({ ...onlyOpen(...UPPER_BOXES.filter((b) => b !== 'fives')) }),
      d('55555'),
    );
    expect(allowed(o)).toEqual(['ones', 'twos', 'threes', 'fours', 'sixes']);
  });
});
