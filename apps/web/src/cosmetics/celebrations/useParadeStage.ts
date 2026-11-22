import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@rollhouse/rules';
import type { Lobby } from '@rollhouse/shared';
import { devOverride } from '../devOverride';
import { eventsBetween } from './events';
import { type ParadeCue, START, stageStep } from './stage';

export interface ParadeStage {
  /** The Ghost Parade to play right now, or null. */
  parade: ParadeCue | null;
  /** The parade has finished marching. */
  endParade(): void;
}

/**
 * Watches the game for a Yatzy and returns the parade to play. A new state is
 * compared with the last one (see eventsBetween), so a reconnect, which replays
 * the same log into the same state, does nothing, and neither does the first
 * state this screen ever sees.
 */
export function useParadeStage(game: GameState, lobby: Lobby): ParadeStage {
  const override = useMemo(devOverride, []);
  // The latest table, for the effect below, which only reruns when the game changes.
  const latest = useRef({ lobby, override });
  latest.current = { lobby, override };

  const state = useRef(START);
  const prev = useRef(game);
  const [parade, setParade] = useState<ParadeCue | null>(null);

  useEffect(() => {
    const events = eventsBetween(prev.current, game);
    prev.current = game;
    const equippedOf = (p: number) => ({
      ...latest.current.lobby.seats[p]?.equipped,
      ...latest.current.override,
    });
    let fired: ParadeCue | null = null;
    for (const event of events) {
      state.current = stageStep(state.current, event, equippedOf);
      fired = state.current.parade ?? fired;
    }
    if (fired) setParade(fired);
  }, [game]);

  const endParade = useCallback(() => setParade(null), []);
  return { parade, endParade };
}
