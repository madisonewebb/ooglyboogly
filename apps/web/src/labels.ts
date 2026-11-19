import type { Box } from '@rollhouse/rules';

/** Short labels for the pad, long ones for prompts and screen readers. */
export const BOX_LABELS: Record<Box, { short: string; long: string }> = {
  ones: { short: 'Ones', long: 'Ones' },
  twos: { short: 'Twos', long: 'Twos' },
  threes: { short: 'Threes', long: 'Threes' },
  fours: { short: 'Fours', long: 'Fours' },
  fives: { short: 'Fives', long: 'Fives' },
  sixes: { short: 'Sixes', long: 'Sixes' },
  threeKind: { short: '3 of a kind', long: 'Three of a Kind' },
  fourKind: { short: '4 of a kind', long: 'Four of a Kind' },
  fullHouse: { short: 'Full house', long: 'Full House' },
  smallStraight: { short: 'Sm. straight', long: 'Small Straight' },
  largeStraight: { short: 'Lg. straight', long: 'Large Straight' },
  yatzy: { short: 'Yatzy', long: 'Yatzy' },
  chance: { short: 'Chance', long: 'Chance' },
};

/** Boxes worth a fixed score, shown beside the label so nobody has to remember. */
export const BOX_POINTS: Partial<Record<Box, number>> = {
  fullHouse: 25,
  smallStraight: 30,
  largeStraight: 40,
  yatzy: 50,
};
