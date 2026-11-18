import {
  type Box,
  type Die,
  FIVE_KIND,
  FULL_HOUSE,
  LARGE_STRAIGHT,
  SMALL_STRAIGHT,
  UPPER_BOXES,
  type UpperBox,
} from './types';

/** How many of each face, indexed 1..6 (index 0 unused). */
export function faceCounts(dice: readonly Die[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]! += 1;
  return counts;
}

const sum = (dice: readonly Die[]) => dice.reduce<number>((a, b) => a + b, 0);

export function isFiveKind(dice: readonly Die[]): boolean {
  return faceCounts(dice).some((c) => c === 5);
}

/** The upper box that matches a face. */
export function upperBoxFor(face: Die): UpperBox {
  return UPPER_BOXES[face - 1]!;
}

function hasRun(counts: number[], start: number, length: number): boolean {
  for (let f = start; f < start + length; f++) if (counts[f] === 0) return false;
  return true;
}

/** Points the dice earn in a box under the standard rules (no joker). */
export function scoreBox(box: Box, dice: readonly Die[]): number {
  const counts = faceCounts(dice);
  const most = Math.max(...counts);
  switch (box) {
    case 'ones':
    case 'twos':
    case 'threes':
    case 'fours':
    case 'fives':
    case 'sixes': {
      const face = UPPER_BOXES.indexOf(box) + 1;
      return counts[face]! * face;
    }
    case 'threeKind':
      return most >= 3 ? sum(dice) : 0;
    case 'fourKind':
      return most >= 4 ? sum(dice) : 0;
    case 'fullHouse':
      return counts.includes(3) && counts.includes(2) ? FULL_HOUSE : 0;
    case 'smallStraight':
      return hasRun(counts, 1, 4) || hasRun(counts, 2, 4) || hasRun(counts, 3, 4)
        ? SMALL_STRAIGHT
        : 0;
    case 'largeStraight':
      return hasRun(counts, 1, 5) || hasRun(counts, 2, 5) ? LARGE_STRAIGHT : 0;
    case 'fiveKind':
      return most === 5 ? FIVE_KIND : 0;
    case 'chance':
      return sum(dice);
  }
}

/** Joker values: the lower boxes at full value, whatever the dice. */
export function jokerLowerValue(box: Box, dice: readonly Die[]): number {
  switch (box) {
    case 'fullHouse':
      return FULL_HOUSE;
    case 'smallStraight':
      return SMALL_STRAIGHT;
    case 'largeStraight':
      return LARGE_STRAIGHT;
    default:
      return scoreBox(box, dice);
  }
}
