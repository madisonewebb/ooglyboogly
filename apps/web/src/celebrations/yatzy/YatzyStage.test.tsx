import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '@rollhouse/rules';
import { YatzyStage } from './YatzyStage';

const game = createGame({
  players: 2,
  cardsPerPlayer: 1,
  playStyle: 'turns',
  multipliers: false,
  turnOrder: [0, 1],
});
const name = (s: number) => ['Madi', 'Sam'][s] ?? `Seat ${s + 1}`;
const noop = () => undefined;

describe('YatzyStage', () => {
  it('shows nothing for a game that is simply there (first state, reconnect, snapshot)', () => {
    const html = renderToString(
      <YatzyStage game={game} name={name} reduced={false} parade={null} endParade={noop} />,
    );
    expect(html).toBe('');
  });

  it('plays the equipped Ghost Parade for the roller when no burst is playing', () => {
    const html = renderToString(
      <YatzyStage
        game={game}
        name={name}
        reduced={false}
        parade={{ player: 1, id: 3 }}
        endParade={noop}
      />,
    );
    expect(html).toContain('data-testid="ghost-parade"');
    expect(html).toContain('Sam&#x27;s ghost parade');
    expect(html).not.toContain('yatzy-celebration');
  });
});
