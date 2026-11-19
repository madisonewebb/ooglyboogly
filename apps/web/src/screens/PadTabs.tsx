import { useRef } from 'react';
import type { Lobby } from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import { flavorVars } from '../flavor';
import { usePrefs } from '../theme/prefs';

export const padTabId = (seat: number) => `pad-tab-${seat}`;
export const PAD_PANEL_ID = 'pad-panel';

interface Props {
  lobby: Lobby;
  cdnBase: string;
  /** The viewer's seat, or null when watching. */
  seat: number | null;
  viewed: number;
  onView: (seat: number) => void;
  /** Whose turn it is in Take turns; null in Everyone at once. */
  up: number | null;
  /** Seats that have filled every box. */
  done: (seat: number) => boolean;
  /** Per seat, bumped when that player scores somewhere you aren't looking. */
  pulses: Record<number, number>;
}

/**
 * One tab per seated player, at the top of the pad: the way to look at anyone's pad.
 * It also carries who's up and who's away, so the top bar doesn't need its own player row.
 */
export function PadTabs({ lobby, cdnBase, seat, viewed, onView, up, done, pulses }: Props) {
  const { theme } = usePrefs();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = lobby.seats.length;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, (i: number) => number> = {
      ArrowRight: (i) => (i + 1) % count,
      ArrowLeft: (i) => (i - 1 + count) % count,
      Home: () => 0,
      End: () => count - 1,
    };
    const go = step[e.key];
    if (!go) return;
    e.preventDefault();
    const next = go(viewed);
    onView(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="pad-tabs" role="tablist" aria-label="Score pads" onKeyDown={onKeyDown}>
      {lobby.seats.map((s, i) => {
        const selected = i === viewed;
        const label = i === seat ? 'You' : s.user.name;
        const notes = [
          i === up ? (i === seat ? 'your turn' : 'their turn') : null,
          s.connected ? null : 'away',
          done(i) ? 'done' : null,
        ].filter(Boolean);
        return (
          <button
            key={s.user.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={padTabId(i)}
            type="button"
            role="tab"
            className={['pad-tab', s.connected ? '' : 'is-away'].join(' ')}
            style={flavorVars(s.flavor, theme)}
            aria-selected={selected}
            aria-controls={PAD_PANEL_ID}
            aria-label={label}
            aria-description={notes.length ? notes.join(', ') : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onView(i)}
          >
            <span className="tab-face">
              <Avatar user={s.user} cdnBase={cdnBase} flavor={s.flavor} />
              {pulses[i] ? <span key={pulses[i]} className="tab-dot" aria-hidden="true" /> : null}
            </span>
            <span className="tab-name">{label}</span>
            {i === up && (
              <span className="tab-tag up" aria-hidden="true">
                Up
              </span>
            )}
            {!s.connected && (
              <span className="tab-tag" aria-hidden="true">
                Away
              </span>
            )}
            {done(i) && (
              <span className="tab-tag" aria-hidden="true">
                Done
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
