import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '@rollhouse/rules';
import type { Lobby, NudgedMessage } from '@rollhouse/shared';
import { NudgeBar } from './Nudge';
import { PrefsProvider } from './theme/prefs';

const user = (id: string, name: string) => ({ id, name, avatar: null });
const lobby = {
  seats: [user('a', 'Madi'), user('b', 'Mom')].map((u) => ({ user: u })),
  spectators: [],
} as unknown as Lobby;
const game = createGame({
  players: 2,
  cardsPerPlayer: 1,
  playStyle: 'turns',
  multipliers: false,
  turnOrder: [0, 1],
});

const render = (seat: number | null, nudges: NudgedMessage[] = []) =>
  renderToString(
    <PrefsProvider>
      <NudgeBar game={game} lobby={lobby} seat={seat} table={{ nudges, send: () => {} }} />
    </PrefsProvider>,
  );

describe('the nudge bar', () => {
  it('has no button the moment a turn starts: it waits for the delay', () => {
    expect(render(1)).not.toContain('<button');
  });

  it('is a polite live region, empty until a nudge arrives', () => {
    const html = render(null);
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('nudged');
  });
});
