import { isYatzy, jokerLowerValue, scoreBox, upperBoxFor } from './scoring';
import {
  BOXES,
  type Box,
  type Card,
  type Die,
  LOWER_BOXES,
  MAX_YATZY_BONUSES,
  UPPER_BOXES,
  YATZY,
} from './types';

export interface BoxOption {
  box: Box;
  /** Points this roll would write here (0 when not allowed). */
  value: number;
  /** Whether this box may take the roll. False only when a joker forces another box. */
  allowed: boolean;
}

export interface CardOptions {
  /** One entry per open box, in pad order. */
  options: BoxOption[];
  /** True when this roll is a joker on this card (its Yatzy box is filled). */
  joker: boolean;
  /** True when writing this roll here earns the 100-point bonus. */
  bonus: boolean;
}

export const isOpen = (card: Card, box: Box) => card.boxes[box] === undefined;

/**
 * What a roll can do on one card. Bonus and joker rules are per card: only
 * this card's Yatzy box counts.
 *
 * A joker applies when the dice are a Yatzy (five of a kind) and this card's
 * Yatzy box is already filled (with 50 or 0). Then, in order:
 *   1. the matching upper box, if open, is the only choice;
 *   2. otherwise any open lower box, at full value;
 *   3. otherwise a 0 in any open upper box.
 * The 100-point bonus needs a 50 in this card's Yatzy box, and each card has
 * room for at most three bonuses, like the three bonus boxes on a paper pad.
 */
export function cardOptions(card: Card, dice: readonly Die[]): CardOptions {
  const open = BOXES.filter((b) => isOpen(card, b));
  const joker = isYatzy(dice) && !isOpen(card, 'yatzy');

  if (!joker) {
    return {
      options: open.map((box) => ({ box, value: scoreBox(box, dice), allowed: true })),
      joker: false,
      bonus: false,
    };
  }

  const bonus = card.boxes.yatzy === YATZY && card.yatzyBonuses < MAX_YATZY_BONUSES;
  const matching = upperBoxFor(dice[0]!);
  let allowed: ReadonlySet<Box>;
  let value: (box: Box) => number;

  if (isOpen(card, matching)) {
    allowed = new Set([matching]);
    value = (box) => scoreBox(box, dice);
  } else if (LOWER_BOXES.some((b) => isOpen(card, b))) {
    allowed = new Set(LOWER_BOXES.filter((b) => isOpen(card, b)));
    value = (box) => jokerLowerValue(box, dice);
  } else {
    allowed = new Set(UPPER_BOXES.filter((b) => isOpen(card, b)));
    value = () => 0;
  }

  return {
    options: open.map((box) =>
      allowed.has(box)
        ? { box, value: value(box), allowed: true }
        : { box, value: 0, allowed: false },
    ),
    joker: true,
    bonus,
  };
}
