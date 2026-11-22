import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { WalletMessage } from '@rollhouse/shared';
import { BrandBar } from './Brand';
import { WalletContext } from './shop/WalletContext';

const wallet = (over: Partial<WalletMessage> = {}): WalletMessage => ({
  balance: 42,
  owned: [],
  equipped: {},
  goal: null,
  canBuy: true,
  ...over,
});

const bar = (w: WalletMessage | null) =>
  renderToString(
    <WalletContext.Provider value={w}>
      <BrandBar />
    </WalletContext.Provider>,
  );

describe('BrandBar coin balance', () => {
  it('shows the balance in the band, with the word coins for screen readers', () => {
    const html = bar(wallet({ balance: 42 }));
    expect(html).toContain('data-testid="nav-balance"');
    expect(html).toMatch(/class="amount">42</);
    expect(html).toMatch(/sr-only"> coins</);
  });

  it('says coin for exactly one', () => {
    expect(bar(wallet({ balance: 1 }))).toMatch(/sr-only"> coin</);
  });

  it('shows 0 for a player who has earned nothing yet', () => {
    expect(bar(wallet({ balance: 0 }))).toMatch(/class="amount">0</);
  });

  it('shows nothing before the wallet arrives', () => {
    expect(bar(null)).not.toContain('nav-balance');
  });

  it('shows nothing for someone who cannot spend, such as a guest outside dev', () => {
    expect(bar(wallet({ canBuy: false, balance: 500 }))).not.toContain('nav-balance');
  });

  it('still has the wordmark and the page heading', () => {
    const html = bar(null);
    expect(html).toContain('band-wordmark');
    expect(html).toContain('Oogly Boogly');
  });
});
