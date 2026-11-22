import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@rollhouse/rules';
import { clockNow, type MoodCue, moodsBetween } from './animation';

/**
 * Watches the game and returns, per seat, the mood that seat's avatar should play: a happy bounce
 * on a score or a Yatzy, a droop on a zero. Like the Ghost Parade it compares each new state with
 * the last one, so a reconnect (the same log replayed) and the first state seen do nothing.
 */
export function useAvatarMoods(game: GameState): Record<number, MoodCue> {
  const prev = useRef(game);
  const nonce = useRef(0);
  const [cues, setCues] = useState<Record<number, MoodCue>>({});

  useEffect(() => {
    const moods = moodsBetween(prev.current, game);
    prev.current = game;
    if (moods.length === 0) return;
    const at = clockNow();
    // Later events win: a Yatzy roll then its score is one bounce, not two.
    const fresh: Record<number, MoodCue> = {};
    for (const m of moods) fresh[m.player] = { mood: m.mood, nonce: ++nonce.current, at };
    setCues((old) => ({ ...old, ...fresh }));
  }, [game]);

  return cues;
}
