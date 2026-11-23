import { describe, expect, it } from 'vitest';
import { applyMove, createGame, type GameSetup } from '@rollhouse/rules';
import type { Lobby } from '@rollhouse/shared';
import { idleKey, joinNames, nudgeLine, nudgeTargets } from './nudgeView';

const setup = (playStyle: 'turns' | 'together'): GameSetup => ({
  players: 3,
  cardsPerPlayer: 1,
  playStyle,
  multipliers: false,
  turnOrder: [0, 1, 2],
});

const user = (id: string, name: string) => ({ id, name, avatar: null });
const lobby = {
  seats: [user('a', 'Madi'), user('b', 'Mom'), user('c', 'Nana')].map((u) => ({ user: u })),
  spectators: [user('s', 'Mema')],
} as unknown as Lobby;

describe('nudgeTargets', () => {
  it('is whoever is up, unless that is you or you are watching', () => {
    const game = createGame(setup('turns'));
    expect(nudgeTargets(game, 1)).toEqual([0]);
    expect(nudgeTargets(game, 0)).toEqual([]);
    expect(nudgeTargets(game, null)).toEqual([]);
  });

  it('is everyone still playing, other than you, when playing together', () => {
    const game = createGame(setup('together'));
    expect(nudgeTargets(game, 0)).toEqual([1, 2]);
  });
});

describe('idleKey', () => {
  it('changes when the person waited on rolls, and when the turn passes', () => {
    const game = createGame(setup('turns'));
    const before = idleKey(game, [0]);
    expect(idleKey(game, [0])).toBe(before);
    const rolled = applyMove(game, { type: 'roll', player: 0, values: [1, 2, 3, 4, 5] });
    expect(idleKey(rolled, [0])).not.toBe(before);
  });
});

describe('wording', () => {
  it('joins names', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['Mom'])).toBe('Mom');
    expect(joinNames(['Mom', 'Nana'])).toBe('Mom and Nana');
    expect(joinNames(['Mom', 'Nana', 'Mema'])).toBe('Mom, Nana and Mema');
  });

  it('talks to the nudged player differently, warmly', () => {
    expect(nudgeLine(lobby, 'a', 'b', 'b')).toBe('Madi nudged you. Take your time, no rush.');
    expect(nudgeLine(lobby, 'a', 'b', 'c')).toBe('Madi nudged Mom');
    expect(nudgeLine(lobby, 'zz', 'b', 'c')).toBe('Someone nudged Mom');
  });
});
