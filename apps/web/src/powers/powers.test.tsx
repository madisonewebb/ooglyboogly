import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { applyMove, createGame, type GameState, type Move } from '@rollhouse/rules';
import { POWERS, type WalletMessage } from '@rollhouse/shared';
import { PrefsProvider } from '../theme/prefs';
import { PowerCard } from '../shop/Shop';
import { PowersBar } from './PowersBar';
import { haveLabel, powerCardState, stockOf, usablePowers } from './powersView';

const wallet = (over: Partial<WalletMessage> = {}): WalletMessage => ({
  balance: 100,
  owned: [],
  powers: {},
  equipped: {},
  goal: null,
  canBuy: true,
  ...over,
});

const newGame = (cards = 1): GameState =>
  createGame({
    players: 2,
    cardsPerPlayer: cards,
    playStyle: 'turns',
    multipliers: false,
    turnOrder: [0, 1],
  });
const play = (g: GameState, ...moves: Move[]) => moves.reduce(applyMove, g);
const roll = (): Move => ({ type: 'roll', player: 0, values: [1, 2, 3, 4, 6] });
const spent = (): GameState => play(newGame(), roll(), roll(), roll());
const withZero = (): GameState =>
  play(newGame(2), roll(), { type: 'score', player: 0, card: 1, box: 'yatzy' });

describe('powersView', () => {
  const [extra, unscratch] = POWERS;

  it('reads stock, with none for a missing wallet or power', () => {
    expect(stockOf(null, 'extraTurn')).toBe(0);
    expect(stockOf(wallet({ powers: { extraTurn: 2 } }), 'extraTurn')).toBe(2);
    expect(stockOf(wallet({ powers: { extraTurn: 2 } }), 'unscratch')).toBe(0);
    expect(haveLabel(0)).toBe('You have none');
    expect(haveLabel(3)).toBe('You have 3');
  });

  it('keeps a power buyable however many you hold, and says why not otherwise', () => {
    expect(powerCardState(extra!, wallet({ powers: { extraTurn: 9 } }))).toEqual({
      kind: 'afford',
    });
    expect(powerCardState(extra!, wallet({ balance: 30 }))).toEqual({ kind: 'short', missing: 50 });
    expect(powerCardState(extra!, wallet({ canBuy: false }))).toEqual({ kind: 'closed' });
    expect(powerCardState(unscratch!, null)).toEqual({ kind: 'closed' });
  });

  it('offers a power only when it is owned and the rules allow it', () => {
    const owns = wallet({ powers: { extraTurn: 1, unscratch: 1 } });
    // Rolls left: nothing yet. No zeros: no unscratch.
    expect(usablePowers(newGame(), 0, owns)).toEqual({ extraTurn: false, unscratch: [] });
    expect(usablePowers(spent(), 0, owns).extraTurn).toBe(true);
    // Not owned, not seated, not allowed to shop, not your turn, no wallet, or game over.
    expect(usablePowers(spent(), 0, wallet()).extraTurn).toBe(false);
    expect(usablePowers(spent(), null, owns).extraTurn).toBe(false);
    expect(usablePowers(spent(), 0, wallet({ ...owns, canBuy: false })).extraTurn).toBe(false);
    expect(usablePowers(spent(), 1, owns).extraTurn).toBe(false);
    expect(usablePowers(spent(), 0, null).extraTurn).toBe(false);
    expect(usablePowers({ ...spent(), finished: true }, 0, owns).extraTurn).toBe(false);
    expect(usablePowers(withZero(), 0, owns).unscratch).toEqual([{ card: 1, box: 'yatzy' }]);
    expect(usablePowers(withZero(), 0, wallet({ powers: { extraTurn: 1 } })).unscratch).toEqual([]);
  });
});

describe('PowersBar', () => {
  const bar = (usable: Parameters<typeof PowersBar>[0]['usable'], cards = 1) =>
    renderToString(
      <PowersBar
        wallet={wallet({ powers: { extraTurn: 2, unscratch: 1 } })}
        usable={usable}
        cards={cards}
        send={vi.fn()}
      />,
    );

  it('shows nothing when nothing can be used', () => {
    expect(bar({ extraTurn: false, unscratch: [] })).toBe('');
  });

  it('shows a button with its count for each usable power', () => {
    const html = bar({ extraTurn: true, unscratch: [{ card: 0, box: 'yatzy' }] });
    expect(html).toContain('Use Extra Turn, you have 2');
    expect(html).toContain('Use Unscratch, you have 1');
    expect(bar({ extraTurn: true, unscratch: [] })).not.toContain('Unscratch');
    expect(bar({ extraTurn: false, unscratch: [{ card: 0, box: 'yatzy' }] })).not.toContain(
      'Extra Turn',
    );
  });
});

describe('PowerCard', () => {
  const card = (w: WalletMessage | null, confirming = false) =>
    renderToString(
      <PrefsProvider>
        <ul>
          <PowerCard
            power={POWERS[0]!}
            wallet={w}
            send={vi.fn()}
            confirming={confirming}
            setConfirming={vi.fn()}
          />
        </ul>
      </PrefsProvider>,
    );

  it('shows what you hold and stays buyable', () => {
    const html = card(wallet({ powers: { extraTurn: 3 } }));
    expect(html).toContain('You have 3');
    expect(html).toContain('Buy Extra Turn for 80 coins');
    expect(html).toContain('You can afford this');
  });

  it('asks before spending', () => {
    expect(card(wallet(), true)).toContain('Spend <strong>80 coins</strong>');
  });

  it('is disabled when short or closed', () => {
    expect(card(wallet({ balance: 10 }))).toContain('70 coins short');
    expect(card(wallet({ canBuy: false }))).toContain('Not for sale to guests');
    expect(card(null)).toContain('You have none');
  });
});
