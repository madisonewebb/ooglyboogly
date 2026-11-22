import { renderToString } from 'react-dom/server';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  type Lobby as LobbyState,
  DEFAULT_SETTINGS,
  entryWithPacks,
  shopEntry,
  type WalletMessage,
} from '@rollhouse/shared';
import { Lobby } from '../screens/Lobby';
import { PrefsProvider } from '../theme/prefs';
import { Shop, ShopCard } from './Shop';
import { WalletContext } from './WalletContext';
import { WalletPanel } from './WalletPanel';

const wallet = (over: Partial<WalletMessage> = {}): WalletMessage => ({
  balance: 55,
  owned: [],
  equipped: {},
  goal: null,
  canBuy: true,
  ...over,
});

const noop = () => {};
const shop = (w: WalletMessage | null) =>
  renderToString(
    <PrefsProvider>
      <Shop wallet={w} send={noop} onClose={noop} />
    </PrefsProvider>,
  );

/** The html of one card, so a state is asserted on its own card and not the page. */
const card = (html: string, id: string): string => {
  const start = html.indexOf(`data-testid="card-${id}"`);
  expect(start).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf('</li>', start));
};

describe('Shop', () => {
  it('shows the balance, every section and a card with name, rarity, price and blurb', () => {
    const html = shop(wallet());
    expect(html).toContain('data-testid="shop-balance"');
    expect(html).toMatch(/shop-balance"[^>]*>.*?55/);
    for (const title of ['Dice skins', 'Brews', 'Pets', 'Celebrations']) {
      expect(html).toContain(title);
    }
    const bone = card(html, 'bone');
    expect(bone).toContain('Bone');
    expect(bone).toContain('Common');
    expect(bone).toContain('40');
    expect(bone).toContain('Ivory dice with ink-black pips.');
    expect(card(html, 'ghostCheerleader')).toContain('Legendary');
    expect(card(html, 'ghostCheerleader')).toContain('400');
  });

  it('shows coming-soon items as disabled with no Buy and no pin', () => {
    // A real catalog item marked coming soon, whatever the catalog says today.
    const bone = { ...shopEntry('bone')!, available: false };
    const html = card(
      renderToString(
        <PrefsProvider>
          <ul>
            <ShopCard
              entry={bone}
              wallet={wallet({ balance: 9999 })}
              send={noop}
              confirming={false}
              setConfirming={noop}
            />
          </ul>
        </PrefsProvider>,
      ),
      'bone',
    );
    expect(html).toContain('data-state="soon"');
    expect(html).toContain('Coming soon');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Coming soon/);
    expect(html).not.toContain('>Buy<');
    expect(html).not.toContain('Pin as goal');
    // A placeholder preview, not a pretend one.
    expect(html).toContain('preview-glyph');
  });

  it('lets a player who can afford an item buy it, and pin it', () => {
    const html = card(shop(wallet({ balance: 40 })), 'violetMurk');
    expect(html).toContain('data-state="afford"');
    expect(html).toContain('You can afford this');
    expect(html).toContain('aria-label="Buy Violet Murk for 40 coins"');
    expect(html).not.toMatch(/Buy Violet Murk for 40 coins"[^>]*disabled/);
    expect(html).toContain('Pin as goal');
    expect(html).toContain('preview-glyph');
  });

  it('leaves the sticker packs out of the shop while they are off', () => {
    const html = shop(wallet({ balance: 999 }));
    expect(html).not.toContain('Sticker packs');
    expect(html).not.toContain('card-cauldronCrew');
    expect(html).not.toContain('card-moonlitCharms');
  });

  /** A single card, so a pack can be shown even while the shop is not selling packs. */
  const lone = (entryId: string, w: WalletMessage): string =>
    card(
      renderToString(
        <PrefsProvider>
          <ul>
            <ShopCard
              entry={entryWithPacks(entryId)!}
              wallet={w}
              send={noop}
              confirming={false}
              setConfirming={noop}
            />
          </ul>
        </PrefsProvider>,
      ),
      entryId,
    );

  it('still draws a sticker pack card when one is shown: real stickers as the preview, nothing to wear', () => {
    const buyable = lone('cauldronCrew', wallet({ balance: 40 }));
    expect(buyable).toContain('data-state="afford"');
    expect(buyable).toContain('preview-pack');
    expect(buyable.match(/<img/g)).toHaveLength(3);
    const owned = lone('cauldronCrew', wallet({ owned: ['cauldronCrew'] }));
    expect(owned).toContain('>Owned<');
    expect(owned).not.toContain('Wear it');
  });

  it('shows how far short, with the Buy button off', () => {
    const html = card(shop(wallet({ balance: 25 })), 'obsidian');
    expect(html).toContain('data-state="short"');
    expect(html).toContain('15 coins short');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Buy Obsidian, 15 coins short"/);
  });

  it('shows what you own, with Wear it or Take off', () => {
    const w = wallet({ owned: ['violetMurk', 'bone', 'toad'], equipped: { diceSkin: 'bone' } });
    const html = shop(w);
    expect(card(html, 'violetMurk')).toContain('>Owned<');
    expect(card(html, 'violetMurk')).toContain('Wear it');
    expect(card(html, 'bone')).toContain('Owned, wearing it');
    expect(card(html, 'bone')).toContain('Take off');
    expect(card(html, 'toad')).toContain('Wear it');
  });

  it('marks the pinned goal and shows its bar', () => {
    const html = shop(wallet({ goal: 'obsidian', balance: 10 }));
    expect(card(html, 'obsidian')).toContain('your goal');
    expect(card(html, 'obsidian')).toContain('Unpin goal');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('10 of 40 coins');
  });

  it('explains to a guest that they cannot spend, and offers nothing to buy', () => {
    const html = shop(wallet({ canBuy: false, balance: 0 }));
    expect(html).toContain('Guests cannot spend coins');
    expect(card(html, 'violetMurk')).toContain('data-state="closed"');
    expect(card(html, 'violetMurk')).not.toContain('Pin as goal');
  });

  it('renders before the wallet has arrived', () => {
    const html = shop(null);
    expect(html).toContain('The Shop');
    expect(card(html, 'violetMurk')).toContain('data-state="closed"');
  });
});

describe('WalletPanel', () => {
  const panel = (w: WalletMessage | null) =>
    renderToString(<WalletPanel wallet={w} onShop={noop} />);

  it('shows the balance, the shop button and the goal bar', () => {
    const html = panel(wallet({ goal: 'violetMurk', balance: 30 }));
    expect(html).toContain('data-testid="lobby-balance"');
    expect(html).toContain('Open the shop');
    expect(html).toContain('30 of 40 coins');
    expect(html).toContain('width:75%');
    expect(html).toContain('aria-valuenow="30"');
  });

  it('says a goal is ready once the coins are there', () => {
    expect(panel(wallet({ goal: 'violetMurk', balance: 99 }))).toContain('Ready to buy');
  });

  it('has no goal bar without a goal, and shows nothing where spending is closed', () => {
    expect(panel(wallet())).not.toContain('progressbar');
    expect(panel(wallet({ balance: 1 }))).toContain('>coin<');
    expect(panel(wallet({ canBuy: false }))).toBe('');
    expect(panel(null)).toBe('');
  });
});

describe('the lobby', () => {
  // The welcome die asks the page for ?quality=; there is no page here.
  vi.stubGlobal('location', { search: '' });
  afterAll(() => vi.unstubAllGlobals());
  const lobby: LobbyState = {
    seats: [
      {
        user: { id: 'u-a', name: 'Ada', avatar: null },
        connected: true,
        tint: 'rose',
        equipped: { diceSkin: 'bone', pet: 'toad' },
      },
      { user: { id: 'u-b', name: 'Bea', avatar: null }, connected: true, tint: 'fern' },
    ],
    hostId: 'u-a',
    settings: DEFAULT_SETTINGS,
    started: false,
    spectators: [],
  };
  const render = (w: WalletMessage | null) =>
    renderToString(
      <PrefsProvider>
        <WalletContext.Provider value={w}>
          <Lobby lobby={lobby} table={{ send: noop } as never} userId="u-a" cdnBase="" />
        </WalletContext.Provider>
      </PrefsProvider>,
    );

  it('shows the balance, the goal and the shop button, and what each seat wears', () => {
    const html = render(wallet({ goal: 'violetMurk', balance: 12 }));
    expect(html).toContain('data-testid="lobby-balance"');
    expect(html).toContain('Open the shop');
    expect(html).toContain('Saving for');
    expect(html).toContain('Bone, Toad');
    // Bea wears nothing, so no look line for her.
    expect(html.match(/seat-look/g)).toHaveLength(1);
  });

  it('shows no coin panel for a guest who cannot spend', () => {
    expect(render(wallet({ canBuy: false }))).not.toContain('lobby-balance');
  });
});
