import { describe, expect, it } from 'vitest';
import { faceCounts, isYatzy, jokerLowerValue, scoreBox, upperBoxFor } from './scoring';
import { d } from './test-helpers';

describe('upper boxes', () => {
  it.each([
    ['ones', '11234', 2],
    ['twos', '22256', 6],
    ['threes', '33333', 15],
    ['fours', '12356', 0],
    ['fives', '55123', 10],
    ['sixes', '66664', 24],
  ] as const)('%s on %s scores %i', (box, dice, points) => {
    expect(scoreBox(box, d(dice))).toBe(points);
  });

  it('maps faces to upper boxes', () => {
    expect(upperBoxFor(1)).toBe('ones');
    expect(upperBoxFor(6)).toBe('sixes');
  });
});

describe('of a kind', () => {
  it.each([
    ['threeKind', '33312', 12],
    ['threeKind', '33332', 14],
    ['threeKind', '44444', 20],
    ['threeKind', '33122', 0],
    ['fourKind', '55552', 22],
    ['fourKind', '66666', 30],
    ['fourKind', '55522', 0],
    ['yatzy', '22222', 50],
    ['yatzy', '22221', 0],
  ] as const)('%s on %s scores %i', (box, dice, points) => {
    expect(scoreBox(box, d(dice))).toBe(points);
  });
});

describe('full house', () => {
  it.each([
    ['33322', 25],
    ['26262', 25],
    ['33333', 0], // a Yatzy is not a full house (unless it's a joker)
    ['33332', 0],
    ['33221', 0],
    ['12345', 0],
  ])('%s scores %i', (dice, points) => {
    expect(scoreBox('fullHouse', d(dice))).toBe(points);
  });
});

describe('straights', () => {
  it.each([
    ['12346', 30],
    ['23451', 30],
    ['34566', 30],
    ['61345', 30],
    ['12344', 30], // a duplicate doesn't break a run of four
    ['12356', 0],
    ['11223', 0],
    ['12345', 30], // a large straight is also a small one
    ['23456', 30],
  ])('small straight %s scores %i', (dice, points) => {
    expect(scoreBox('smallStraight', d(dice))).toBe(points);
  });

  it.each([
    ['12345', 40],
    ['54321', 40],
    ['23456', 40],
    ['13456', 0],
    ['12346', 0],
    ['12245', 0],
  ])('large straight %s scores %i', (dice, points) => {
    expect(scoreBox('largeStraight', d(dice))).toBe(points);
  });
});

describe('chance', () => {
  it('is the sum of the dice', () => {
    expect(scoreBox('chance', d('12345'))).toBe(15);
    expect(scoreBox('chance', d('66666'))).toBe(30);
    expect(scoreBox('chance', d('11111'))).toBe(5);
  });
});

describe('helpers', () => {
  it('counts faces', () => {
    expect(faceCounts(d('11366'))).toEqual([0, 2, 0, 1, 0, 0, 2]);
  });

  it('detects a Yatzy', () => {
    expect(isYatzy(d('44444'))).toBe(true);
    expect(isYatzy(d('44443'))).toBe(false);
  });

  it('gives joker lower boxes full value', () => {
    const dice = d('44444');
    expect(jokerLowerValue('fullHouse', dice)).toBe(25);
    expect(jokerLowerValue('smallStraight', dice)).toBe(30);
    expect(jokerLowerValue('largeStraight', dice)).toBe(40);
    expect(jokerLowerValue('threeKind', dice)).toBe(20);
    expect(jokerLowerValue('fourKind', dice)).toBe(20);
    expect(jokerLowerValue('chance', dice)).toBe(20);
  });
});
