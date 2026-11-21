import { createGame } from './engine';
import type { Box, Card, Die, GameSetup, GameState } from './types';

/** Dice from a string like "11234". */
export const d = (faces: string): Die[] => [...faces].map((c) => Number(c) as Die);

export const setup = (over: Partial<GameSetup> = {}): GameSetup => {
  const players = over.players ?? 1;
  return {
    players,
    cardsPerPlayer: 1,
    playStyle: 'turns',
    multipliers: false,
    turnOrder: Array.from({ length: players }, (_, i) => i),
    ...over,
  };
};

export const card = (boxes: Partial<Record<Box, number>> = {}, yatzyBonuses = 0): Card => ({
  boxes,
  yatzyBonuses,
});

/** A state with some boxes pre-filled on one player's card. */
export function withCard(state: GameState, player: number, index: number, c: Card): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === player ? { ...p, cards: p.cards.map((old, j) => (j === index ? c : old)) } : p,
    ),
  };
}

export const newGame = (over: Partial<GameSetup> = {}) => createGame(setup(over));

/**
 * A finished game with the given cards, one array of cards per player. The
 * card count comes from the first player's array.
 */
export function finishedGame(
  cardsByPlayer: readonly (readonly Card[])[],
  over: Partial<GameSetup> = {},
): GameState {
  const base = newGame({
    players: cardsByPlayer.length,
    cardsPerPlayer: cardsByPlayer[0]!.length,
    ...over,
  });
  return {
    ...base,
    players: base.players.map((p, i) => ({ ...p, cards: cardsByPlayer[i]! })),
    finished: true,
  };
}
