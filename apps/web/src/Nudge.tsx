/**
 * The nudge: when it is someone else's turn and they have been slow, a small
 * button lets you give them a friendly poke. The server decides whether it is
 * allowed (it knows when their turn really began); the button just waits a
 * while on this screen first, so it is not there from the first second.
 * The nudged player hears a soft chime and sees a short note; everyone else
 * sees a passing line.
 */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@rollhouse/rules';
import { type Lobby, MSG_NUDGE, NUDGE_AFTER_MS, NUDGE_COOLDOWN_MS } from '@rollhouse/shared';
import { idleKey, joinNames, nudgeLine, nudgeTargets } from './nudgeView';
import { playNudge } from './sound';
import { usePrefs } from './theme/prefs';
import type { Table } from './useTable';
import './nudge.css';

/** How long a nudge line stays up. */
const NOTE_MS = 5000;

interface Props {
  game: GameState;
  lobby: Lobby;
  seat: number | null;
  table: Pick<Table, 'nudges' | 'send'>;
}

export function NudgeBar({ game, lobby, seat, table }: Props) {
  const { reducedMotion } = usePrefs();
  const targets = nudgeTargets(game, seat);
  const key = idleKey(game, targets);
  const me = seat === null ? null : (lobby.seats[seat]?.user.id ?? null);

  // The button appears once the people being waited on have been idle a while.
  const [ready, setReady] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const hasTargets = targets.length > 0;
  useEffect(() => {
    setReady(false);
    if (!hasTargets) return;
    const id = setTimeout(() => setReady(true), NUDGE_AFTER_MS);
    return () => clearTimeout(id);
  }, [key, hasTargets]);
  useEffect(() => {
    if (!sentAt) return;
    const id = setTimeout(() => setNow(Date.now()), NUDGE_COOLDOWN_MS + 50);
    return () => clearTimeout(id);
  }, [sentAt]);
  const cooling = sentAt > 0 && now - sentAt < NUDGE_COOLDOWN_MS;

  // The newest nudge shows for a few seconds. Those aimed at you chime and wiggle.
  const newest = table.nudges.at(-1);
  const [shown, setShown] = useState<typeof newest>(undefined);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!newest || seen.current === newest.id) return;
    seen.current = newest.id;
    setShown(newest);
    if (newest.toUserId === me) playNudge();
    const id = setTimeout(() => setShown((s) => (s?.id === newest.id ? undefined : s)), NOTE_MS);
    return () => clearTimeout(id);
  }, [newest, me]);

  const names = targets.map((p) => lobby.seats[p]?.user.name ?? `Seat ${p + 1}`);
  const toYou = shown !== undefined && shown.toUserId === me;
  const wiggle = toYou && !reducedMotion;

  return (
    <div className="nudge-bar" data-nudged={wiggle ? 'true' : undefined}>
      {ready && hasTargets && (
        <button
          type="button"
          className="nudge-button"
          disabled={cooling}
          aria-label={cooling ? 'Nudge sent' : `Nudge ${joinNames(names)}`}
          onClick={() => {
            table.send(MSG_NUDGE);
            setSentAt(Date.now());
            setNow(Date.now());
          }}
        >
          {cooling ? 'Nudged' : `Nudge ${joinNames(names)}`}
        </button>
      )}
      <p className={`nudge-note${toYou ? ' to-you' : ''}`} role="status" aria-live="polite">
        {shown ? nudgeLine(lobby, shown.fromUserId, shown.toUserId, me) : ''}
      </p>
    </div>
  );
}
