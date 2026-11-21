import { describe, expect, it } from 'vitest';
import type { PayoutMessage } from '@rollhouse/shared';
import { balanceText, coinLine, coinLineFor, coinsText } from './payoutView';

const seat = (userId: string, finish: number, win: number, yatzy: number) => ({
  userId,
  coins: finish + win + yatzy,
  finish,
  win,
  yatzy,
});

const payout: PayoutMessage = {
  seats: [seat('winner', 10, 10, 3), seat('other', 10, 0, 0)],
  balance: 42,
};

describe('coinsText', () => {
  it('says 1 coin and N coins', () => {
    expect(coinsText(1)).toBe('1 coin');
    expect(coinsText(0)).toBe('0 coins');
    expect(coinsText(23)).toBe('23 coins');
  });
});

describe('coinLine', () => {
  it('shows the total and every part that paid', () => {
    expect(coinLine(payout.seats[0]!)).toEqual({
      label: '+23 coins',
      breakdown: 'finished 10, won 10, Yatzy 3',
    });
  });

  it('leaves out parts that paid nothing', () => {
    expect(coinLine(payout.seats[1]!)).toEqual({ label: '+10 coins', breakdown: 'finished 10' });
    expect(coinLine(seat('x', 3, 0, 1)).breakdown).toBe('finished 3, Yatzy 1');
  });

  it('says +1 coin for a solo game', () => {
    expect(coinLine(seat('solo', 1, 0, 0))).toEqual({ label: '+1 coin', breakdown: 'finished 1' });
  });
});

describe('coinLineFor', () => {
  it('finds the line for a paid player', () => {
    expect(coinLineFor(payout, 'other')!.label).toBe('+10 coins');
  });

  it('is null with no payout at all', () => {
    expect(coinLineFor(null, 'winner')).toBeNull();
  });

  it('is null for someone who was not paid', () => {
    expect(coinLineFor(payout, 'a-spectator')).toBeNull();
  });
});

describe('balanceText', () => {
  it('shows the viewer their new total', () => {
    expect(balanceText(payout)).toBe('You now have 42 coins');
    expect(balanceText({ ...payout, balance: 1 })).toBe('You now have 1 coin');
  });

  it('shows nothing to a spectator or when there is no payout', () => {
    expect(balanceText({ ...payout, balance: null })).toBeNull();
    expect(balanceText(null)).toBeNull();
  });
});
