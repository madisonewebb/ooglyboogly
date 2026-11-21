import type { PayoutMessage, SeatPayoutInfo } from '@rollhouse/shared';

/** "1 coin", "20 coins". */
export const coinsText = (n: number): string => `${n} ${n === 1 ? 'coin' : 'coins'}`;

/** What one seat earned and why, ready to print under their name. */
export interface CoinLine {
  /** "+20 coins". */
  label: string;
  /** "finished 10, won 10, Yatzy 3", leaving out whatever was zero. */
  breakdown: string;
}

export function coinLine(seat: SeatPayoutInfo): CoinLine {
  const parts = [
    seat.finish > 0 ? `finished ${seat.finish}` : '',
    seat.win > 0 ? `won ${seat.win}` : '',
    seat.yatzy > 0 ? `Yatzy ${seat.yatzy}` : '',
  ].filter(Boolean);
  return { label: `+${coinsText(seat.coins)}`, breakdown: parts.join(', ') };
}

/** The coin line for one player, or null when there is no payout or they were not paid. */
export function coinLineFor(payout: PayoutMessage | null, userId: string): CoinLine | null {
  const seat = payout?.seats.find((s) => s.userId === userId);
  return seat ? coinLine(seat) : null;
}

/** "You now have 42 coins", or null for someone with no balance (watching). */
export function balanceText(payout: PayoutMessage | null): string | null {
  return payout?.balance == null ? null : `You now have ${coinsText(payout.balance)}`;
}
