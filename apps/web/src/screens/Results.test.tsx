import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame, type GameState } from '@rollhouse/rules';
import type { Lobby, PayoutMessage, Seat } from '@rollhouse/shared';
import { DEFAULT_SETTINGS } from '@rollhouse/shared';
import { PrefsProvider } from '../theme/prefs';
import { Results } from './Results';

const seat = (id: string, name: string, tint: Seat['tint']): Seat => ({
  user: { id, name, avatar: null },
  connected: true,
  tint,
});

const lobby: Lobby = {
  seats: [seat('u-a', 'Ada', 'rose'), seat('u-b', 'Bea', 'fern')],
  hostId: 'u-a',
  settings: DEFAULT_SETTINGS,
  started: true,
  spectators: [],
};

/** A finished 1-card game in which Ada scores more than Bea. */
const finished = (): GameState => {
  const base = createGame({
    players: 2,
    cardsPerPlayer: 1,
    playStyle: 'turns',
    multipliers: false,
    turnOrder: [0, 1],
  });
  const cards = [{ chance: 25 }, { chance: 10 }];
  return {
    ...base,
    finished: true,
    players: base.players.map((p, i) => ({
      ...p,
      cards: [{ boxes: cards[i]!, yatzyBonuses: 0 }],
    })),
  };
};

const payout: PayoutMessage = {
  seats: [
    { userId: 'u-a', coins: 6, finish: 3, win: 3, yatzy: 0 },
    { userId: 'u-b', coins: 3, finish: 3, win: 0, yatzy: 0 },
  ],
  balance: 6,
};

const render = (p: PayoutMessage | null) =>
  renderToString(
    <PrefsProvider>
      <Results game={finished()} lobby={lobby} cdnBase="" payout={p} />
    </PrefsProvider>,
  );

describe('Results', () => {
  it('shows the winner and standings with no coin lines before the payout arrives', () => {
    const html = render(null);
    expect(html).toContain('Ada wins!');
    expect(html).toContain('Bea');
    expect(html).not.toContain('coin-line');
    expect(html).not.toContain('coin-balance');
    expect(html).not.toMatch(/coin/i);
  });

  it('adds each player’s earnings and the viewer’s balance once the payout arrives', () => {
    const html = render(payout);
    expect(html).toContain('Ada wins!');
    expect(html.match(/data-testid="coin-line"/g)).toHaveLength(2);
    expect(html).toContain('+6 coins');
    expect(html).toContain('finished 3, won 3');
    expect(html).toContain('+3 coins');
    expect(html).toContain('You now have 6 coins');
  });

  it('shows the amounts but no balance to someone watching', () => {
    const html = render({ ...payout, balance: null });
    expect(html.match(/data-testid="coin-line"/g)).toHaveLength(2);
    expect(html).not.toContain('coin-balance');
    expect(html).not.toContain('You now have');
  });

  it('shows a coin line only for players who were paid', () => {
    const html = render({ seats: [payout.seats[0]!], balance: 6 });
    expect(html.match(/data-testid="coin-line"/g)).toHaveLength(1);
  });
});
