import { describe, expect, it } from 'vitest';
import {
  PACKS_FOR_SALE,
  PRICES,
  SHOP_ENTRIES,
  shopEntry,
  type PayoutMessage,
  type WalletMessage,
} from '@rollhouse/shared';
import {
  type CardState,
  cardState,
  coinWord,
  goalProgress,
  lookLine,
  shopSections,
  stateLabel,
  withPayoutBalance,
} from './shopView';

const wallet = (over: Partial<WalletMessage> = {}): WalletMessage => ({
  balance: 0,
  owned: [],
  powers: {},
  equipped: {},
  goal: null,
  canBuy: true,
  ...over,
});
const entry = (id: string) => shopEntry(id)!;
/** A real catalog item marked coming soon, whatever the catalog says today. */
const soon = (id: string) => ({ ...entry(id), available: false });

describe('cardState', () => {
  it('says coming soon for what cannot be drawn yet, however rich you are', () => {
    expect(cardState(soon('bone'), wallet({ balance: 9999 }))).toEqual({ kind: 'soon' });
  });

  it('says afford at exactly the price, and short below it by how many coins', () => {
    expect(cardState(entry('violetMurk'), wallet({ balance: 40 }))).toEqual({ kind: 'afford' });
    expect(cardState(entry('violetMurk'), wallet({ balance: 39 }))).toEqual({
      kind: 'short',
      missing: 1,
    });
    expect(cardState(entry('violetMurk'), wallet())).toEqual({ kind: 'short', missing: 40 });
  });

  it('says owned, and worn when it is equipped in its slot', () => {
    const w = wallet({ owned: ['bone', 'swamp', 'violetMurk'], equipped: { diceSkin: 'bone' } });
    expect(cardState(entry('bone'), w)).toEqual({ kind: 'owned', worn: true });
    expect(cardState(entry('swamp'), w)).toEqual({ kind: 'owned', worn: false });
    // A pack is owned but is never worn.
    expect(cardState(entry('violetMurk'), w)).toEqual({ kind: 'owned', worn: false });
  });

  it('is closed for someone who cannot spend, and before the wallet arrives', () => {
    expect(cardState(entry('violetMurk'), wallet({ canBuy: false, balance: 500 }))).toEqual({
      kind: 'closed',
    });
    expect(cardState(entry('violetMurk'), null)).toEqual({ kind: 'closed' });
    expect(cardState(soon('bone'), null)).toEqual({ kind: 'soon' });
  });
});

describe('stateLabel', () => {
  it('writes every state in words', () => {
    const states: CardState[] = [
      { kind: 'soon' },
      { kind: 'owned', worn: false },
      { kind: 'owned', worn: true },
      { kind: 'afford' },
      { kind: 'short', missing: 1 },
      { kind: 'short', missing: 15 },
      { kind: 'closed' },
    ];
    expect(states.map(stateLabel)).toEqual([
      'Coming soon',
      'Owned',
      'Owned, wearing it',
      'You can afford this',
      '1 coin short',
      '15 coins short',
      'Not for sale to guests',
    ]);
    expect(coinWord(0)).toBe('0 coins');
  });
});

describe('shopSections', () => {
  const sections = shopSections();

  it('lists each slot, leaves out the sticker packs while they are off, and shows every entry once', () => {
    // Sticker packs are switched off (PACKS_FOR_SALE), so their section is left out, not shown empty.
    expect(PACKS_FOR_SALE).toBe(false);
    expect(sections.map((s) => s.key)).toEqual([
      'diceSkin',
      'brew',
      'celebration',
      'hat',
      'face',
      'held',
      'aura',
    ]);
    expect(sections.flatMap((s) => s.entries.map((e) => e.id)).sort()).toEqual(
      SHOP_ENTRIES.map((e) => e.id).sort(),
    );
  });

  it('shows the prices from the catalog tiers', () => {
    expect(sections[0]!.entries.map((e) => e.price)).toEqual([40, 40, 100, 100, 300]);
    expect(sections[2]!.entries.map((e) => e.price)).toEqual([PRICES.celebration.spooky]);
  });
});

describe('goalProgress', () => {
  it('is null with no goal, an unknown goal, or a goal already owned', () => {
    expect(goalProgress(null)).toBeNull();
    expect(goalProgress(wallet())).toBeNull();
    expect(goalProgress(wallet({ goal: 'gone' }))).toBeNull();
    expect(goalProgress(wallet({ goal: 'violetMurk', owned: ['violetMurk'] }))).toBeNull();
  });

  it('counts coins toward the price, rounding down, and caps at full', () => {
    const at = (balance: number) => goalProgress(wallet({ goal: 'violetMurk', balance }))!;
    expect(at(0)).toMatchObject({ percent: 0, ready: false });
    expect(at(10)).toMatchObject({ percent: 25, ready: false });
    expect(at(39)).toMatchObject({ percent: 97, ready: false });
    expect(at(40)).toMatchObject({ percent: 100, ready: true });
    expect(at(500)).toMatchObject({ percent: 100, ready: true });
    expect(at(0).entry.name).toBe('Violet Murk');
  });
});

describe('lookLine', () => {
  it('names what is worn, or nothing', () => {
    expect(lookLine(undefined)).toBeNull();
    expect(lookLine({})).toBeNull();
    expect(lookLine({ diceSkin: 'bone', brew: 'swamp' })).toBe('Bone, Swamp');
    expect(lookLine({ pet: 'toad' } as never)).toBeNull();
  });
});

describe('withPayoutBalance', () => {
  const payout = (balance: number | null): PayoutMessage => ({ seats: [], balance });

  it('takes the new balance from a payout', () => {
    const w = wallet({ balance: 3, owned: ['violetMurk'], goal: 'swamp' });
    expect(withPayoutBalance(w, payout(13))).toEqual({ ...w, balance: 13 });
  });

  it('leaves everything else in the wallet alone', () => {
    const w = wallet({ balance: 0, owned: ['bone'], equipped: { diceSkin: 'bone' } });
    const next = withPayoutBalance(w, payout(6))!;
    expect(next.owned).toEqual(['bone']);
    expect(next.equipped).toEqual({ diceSkin: 'bone' });
    expect(next.canBuy).toBe(true);
  });

  it('changes nothing for someone who was not paid', () => {
    const w = wallet({ balance: 9 });
    expect(withPayoutBalance(w, payout(null))).toBe(w);
  });

  it('has nothing to update before the wallet has arrived', () => {
    expect(withPayoutBalance(null, payout(6))).toBeNull();
  });
});
