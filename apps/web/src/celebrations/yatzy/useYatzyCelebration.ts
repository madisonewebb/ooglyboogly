import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '@rollhouse/rules';
import { playYatzyFanfare } from '../../sound';
import { yatzyRollsBetween } from './yatzyRolls';

/** A celebration to play: who rolled it, and an id so a second one starts over. */
export interface YatzyCue {
  id: number;
  players: number[];
}

/**
 * Watches the replayed game for a Yatzy roll and returns the celebration to
 * show, the same on every screen at the table. Each new state is compared with
 * the last (see yatzyRollsBetween), so a reconnect, a replay or the very first
 * state this screen sees fires nothing. The fanfare plays here, once, as the
 * cue is made; it respects the mute and volume settings in sound.ts.
 */
export function useYatzyCelebration(game: GameState, reduced: boolean) {
  const prev = useRef(game);
  const nonce = useRef(0);
  const [cue, setCue] = useState<YatzyCue | null>(null);
  const quiet = useRef(reduced);
  quiet.current = reduced;

  useEffect(() => {
    const players = yatzyRollsBetween(prev.current, game);
    prev.current = game;
    if (players.length === 0) return;
    nonce.current += 1;
    setCue({ id: nonce.current, players });
    playYatzyFanfare(quiet.current);
  }, [game]);

  const end = useCallback(() => setCue(null), []);
  return { cue, end };
}
