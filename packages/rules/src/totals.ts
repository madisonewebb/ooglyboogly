import {
  type Card,
  FIVE_KIND_BONUS,
  type GameState,
  LOWER_BOXES,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  UPPER_BOXES,
} from './types';

export interface CardTotal {
  upper: number;
  upperBonus: number;
  lower: number;
  fiveKindBonus: number;
  /** Before any multiplier. */
  raw: number;
  /** 1, or the card's position (1 to 5) with classic multipliers on. */
  multiplier: number;
  total: number;
}

export interface PlayerTotal {
  cards: CardTotal[];
  total: number;
}

const add = (card: Card, boxes: readonly string[]) =>
  boxes.reduce((s, b) => s + (card.boxes[b as keyof Card['boxes']] ?? 0), 0);

export function cardTotal(card: Card, index: number, multipliers: boolean): CardTotal {
  const upper = add(card, UPPER_BOXES);
  const upperBonus = upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
  const lower = add(card, LOWER_BOXES);
  const fiveKindBonus = card.fiveKindBonuses * FIVE_KIND_BONUS;
  const raw = upper + upperBonus + lower + fiveKindBonus;
  const multiplier = multipliers ? index + 1 : 1;
  return { upper, upperBonus, lower, fiveKindBonus, raw, multiplier, total: raw * multiplier };
}

/** A player's final score is the sum of all their cards. */
export function playerTotal(state: GameState, player: number): PlayerTotal {
  const cards = state.players[player]!.cards.map((c, i) =>
    cardTotal(c, i, state.setup.multipliers),
  );
  return { cards, total: cards.reduce((s, c) => s + c.total, 0) };
}
