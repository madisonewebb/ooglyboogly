import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@rollhouse/rules';
import type { Lobby } from '@rollhouse/shared';
import { devOverride } from '../devOverride';
import { eventsBetween, REACTION_MS } from './mood';
import { type ParadeCue, type Reaction, START, petOnShow, stageStep } from './stage';

export interface PetStage {
  /** The pet on show, its pose, and a nonce that changes on every reaction. */
  pet: ReturnType<typeof petOnShow>;
  /** The Ghost Parade to play right now, or null. */
  parade: ParadeCue | null;
  /** The parade has finished marching. */
  endParade(): void;
}

/**
 * Watches the game for what a pet cares about and returns what to show. A new
 * state is compared with the last one (see eventsBetween), so a reconnect, which
 * replays the same log into the same state, does nothing, and neither does the
 * first state this screen ever sees. Reactions settle back to idle by timer.
 */
export function usePetStage(game: GameState, lobby: Lobby, trayPlayer: number): PetStage {
  const override = useMemo(devOverride, []);
  // The latest table, for the effect below, which only reruns when the game changes.
  const latest = useRef({ lobby, trayPlayer, override });
  latest.current = { lobby, trayPlayer, override };

  const state = useRef(START);
  const prev = useRef(game);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [parade, setParade] = useState<ParadeCue | null>(null);
  const settle = useRef<number | undefined>(undefined);

  useEffect(() => {
    const events = eventsBetween(prev.current, game);
    prev.current = game;
    if (events.length === 0) return;
    const ctx = {
      playStyle: game.setup.playStyle,
      trayPlayer: latest.current.trayPlayer,
      equippedOf: (p: number) => ({
        ...latest.current.lobby.seats[p]?.equipped,
        ...latest.current.override,
      }),
    };
    const before = state.current.reaction;
    let fired: ParadeCue | null = null;
    for (const event of events) {
      state.current = stageStep(state.current, event, ctx);
      fired = state.current.parade ?? fired;
    }
    if (fired) setParade(fired);
    const r = state.current.reaction;
    if (r && r !== before) {
      setReaction(r);
      window.clearTimeout(settle.current);
      settle.current = window.setTimeout(() => setReaction(null), REACTION_MS[r.pose]);
    }
  }, [game]);

  useEffect(() => () => window.clearTimeout(settle.current), []);
  const endParade = useCallback(() => setParade(null), []);

  const equippedOf = (p: number) => ({ ...lobby.seats[p]?.equipped, ...override });
  return {
    pet: petOnShow(game.setup.playStyle, trayPlayer, reaction, equippedOf),
    parade,
    endParade,
  };
}
