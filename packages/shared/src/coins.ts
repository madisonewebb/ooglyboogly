import { type GameState, playerTotal, YATZY } from '@rollhouse/rules';

/**
 * What a finished game pays each player, in coins for the aquarium shop.
 * Everyone earns something: a family game shouldn't leave anyone empty-handed.
 */
export const COIN_RATES = {
  /** For playing a game to the end. */
  finish: 10,
  /** Points per coin, on the average card (raw, before multipliers). */
  pointsPerCoin: 10,
  /** For the top total, shared by a tie; not in a game played alone. */
  win: 15,
  /** For each 50 in a Yatzy box and each Yatzy bonus. */
  yatzy: 10,
  /** For each card that earns the upper bonus. */
  upperBonus: 5,
} as const;

export interface CoinsEarned {
  finish: number;
  score: number;
  win: number;
  yatzys: number;
  upperBonuses: number;
  total: number;
}

export function coinsEarned(game: GameState, player: number): CoinsEarned {
  const totals = game.players.map((_, i) => playerTotal(game, i));
  const mine = totals[player]!;
  const best = Math.max(...totals.map((t) => t.total));
  const raw = mine.cards.reduce((s, c) => s + c.raw, 0);
  const score = Math.round(raw / mine.cards.length / COIN_RATES.pointsPerCoin);
  const win = game.setup.players > 1 && mine.total === best ? COIN_RATES.win : 0;
  const yatzyCount = game.players[player]!.cards.reduce(
    (n, c) => n + (c.boxes.yatzy === YATZY ? 1 + c.yatzyBonuses : 0),
    0,
  );
  const upperCount = mine.cards.filter((c) => c.upperBonus > 0).length;
  const yatzys = yatzyCount * COIN_RATES.yatzy;
  const upperBonuses = upperCount * COIN_RATES.upperBonus;
  const finish = COIN_RATES.finish;
  return {
    finish,
    score,
    win,
    yatzys,
    upperBonuses,
    total: finish + score + win + yatzys + upperBonuses,
  };
}
