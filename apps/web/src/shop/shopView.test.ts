import { describe, expect, it } from 'vitest';
import { PRICES, SHOP_ENTRIES, shopEntry, type WalletMessage } from '@rollhouse/shared';
import {
  type CardState,
  cardState,
  coinWord,
  goalProgress,
  lookLine,
  shopSections,
  stateLabel,
} from './shopView';

const wallet = (over: Partial<WalletMessage> = {}): WalletMessage => ({
  balance: 0,
  owned: [],
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
    expect(cardState(entry('cauldronCrew'), wallet({ balance: 40 }))).toEqual({ kind: 'afford' });
    expect(cardState(entry('cauldronCrew'), wallet({ balance: 39 }))).toEqual({
      kind: 'short',
      missing: 1,
    });
    expect(cardState(entry('cauldronCrew'), wallet())).toEqual({ kind: 'short', missing: 40 });
  });

  it('says owned, and worn when it is equipped in its slot', () => {
    const w = wallet({ owned: ['bone', 'toad', 'cauldronCrew'], equipped: { diceSkin: 'bone' } });
    expect(cardState(entry('bone'), w)).toEqual({ kind: 'owned', worn: true });
    expect(cardState(entry('toad'), w)).toEqual({ kind: 'owned', worn: false });
    // A pack is owned but is never worn.
    expect(cardState(entry('cauldronCrew'), w)).toEqual({ kind: 'owned', worn: false });
  });

  it('is closed for someone who cannot spend, and before the wallet arrives', () => {
    expect(cardState(entry('cauldronCrew'), wallet({ canBuy: false, balance: 500 }))).toEqual({
      kind: 'closed',
    });
    expect(cardState(entry('cauldronCrew'), null)).toEqual({ kind: 'closed' });
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

  it('lists the packs first, then each slot, with every entry exactly once', () => {
    expect(sections.map((s) => s.key)).toEqual([
      'stickers',
      'diceSkin',
      'brew',
      'pet',
      'celebration',
    ]);
    expect(sections.flatMap((s) => s.entries.map((e) => e.id)).sort()).toEqual(
      SHOP_ENTRIES.map((e) => e.id).sort(),
    );
  });

  it('shows the prices from the catalog tiers', () => {
    expect(sections[0]!.entries.map((e) => e.price)).toEqual([40, 40]);
    expect(sections[3]!.entries.map((e) => e.price)).toEqual([
      PRICES.pet.common,
      PRICES.pet.spooky,
      PRICES.pet.spooky,
      PRICES.pet.legendary,
    ]);
  });
});

describe('goalProgress', () => {
  it('is null with no goal, an unknown goal, or a goal already owned', () => {
    expect(goalProgress(null)).toBeNull();
    expect(goalProgress(wallet())).toBeNull();
    expect(goalProgress(wallet({ goal: 'gone' }))).toBeNull();
    expect(goalProgress(wallet({ goal: 'cauldronCrew', owned: ['cauldronCrew'] }))).toBeNull();
  });

  it('counts coins toward the price, rounding down, and caps at full', () => {
    const at = (balance: number) => goalProgress(wallet({ goal: 'cauldronCrew', balance }))!;
    expect(at(0)).toMatchObject({ percent: 0, ready: false });
    expect(at(10)).toMatchObject({ percent: 25, ready: false });
    expect(at(39)).toMatchObject({ percent: 97, ready: false });
    expect(at(40)).toMatchObject({ percent: 100, ready: true });
    expect(at(500)).toMatchObject({ percent: 100, ready: true });
    expect(at(0).entry.name).toBe('Cauldron Crew');
  });
});

describe('lookLine', () => {
  it('names what is worn, or nothing', () => {
    expect(lookLine(undefined)).toBeNull();
    expect(lookLine({})).toBeNull();
    expect(lookLine({ diceSkin: 'bone', pet: 'toad' })).toBe('Bone, Toad');
    expect(lookLine({ pet: 'removed-item' })).toBeNull();
  });
});
