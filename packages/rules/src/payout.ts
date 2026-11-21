import { playerTotal } from './totals';
import { type Card, type GameState, YATZY } from './types';

/**
 * The coin payout for a finished game. This file is the one place the numbers
 * live: the server pays what it returns, and clients only display it.
 *
 * Every amount is written for a 3-card game and scales with the card count, so
 * a 5-card game pays 5/3 as much and a 1-card game 1/3. Money is whole coins.
 */
export const FINISH_COINS = 10;
export const YATZY_COINS = 3;
/** A game played alone pays this, and nothing else: no win, no Yatzy. */
export const SOLO_COINS = 1;
/** The card count the base amounts are written for. */
export const BASELINE_CARDS = 3;

export interface PayoutBreakdown {
  /** For finishing the game. */
  finish: number;
  /** For winning; a tie splits it, rounded down. */
  win: number;
  /** For scoring a Yatzy (once per game, however many). */
  yatzy: number;
}

export interface SeatPayout {
  /** Seat index, the same as the player index in the game. */
  player: number;
  total: number;
  breakdown: PayoutBreakdown;
}

/** A base amount scaled to the number of cards, to the nearest coin. */
export const scaled = (base: number, cards: number): number =>
  Math.round((base * cards) / BASELINE_CARDS);

const scoredYatzy = (card: Card): boolean => card.boxes.yatzy === YATZY || card.yatzyBonuses > 0;

/** What every seat earns from a finished game, in seat order. */
export function computePayouts(state: GameState): SeatPayout[] {
  if (!state.finished) throw new Error('payouts are only paid once the game is finished');
  const { players, cardsPerPlayer } = state.setup;

  if (players === 1) {
    return [{ player: 0, total: SOLO_COINS, breakdown: { finish: SOLO_COINS, win: 0, yatzy: 0 } }];
  }

  const finish = scaled(FINISH_COINS, cardsPerPlayer);
  const yatzyCoins = scaled(YATZY_COINS, cardsPerPlayer);
  const totals = state.players.map((_, p) => playerTotal(state, p).total);
  const best = Math.max(...totals);
  const winners = totals.filter((t) => t === best).length;
  const winShare = Math.floor(finish / winners);

  return state.players.map((p, player) => {
    const breakdown: PayoutBreakdown = {
      finish,
      win: totals[player] === best ? winShare : 0,
      yatzy: p.cards.some(scoredYatzy) ? yatzyCoins : 0,
    };
    return { player, total: breakdown.finish + breakdown.win + breakdown.yatzy, breakdown };
  });
}
