import { useEffect, useMemo } from 'react';
import { GhostBody } from '../pets/placeholders';
import { PARADE_ART } from './artIndex';
import { paradeAnnouncement, paradeDuration, paradePlan } from './paradePlan';
import './parade.css';

interface Props {
  /** Changes for each parade, so a second one starts over. */
  id: number;
  /** Whose Yatzy it is. */
  name: string;
  reduced: boolean;
  /** The parade has marched off. */
  onDone(): void;
  /** Overridable for tests; the real art lookup by default. */
  art?: string | undefined;
}

/**
 * A line of little ghosts marching across the whole screen for a Yatzy, on
 * every client, then gone. It sits over everything, takes no clicks and is
 * pure CSS motion, so it costs React nothing while it marches. With reduced
 * motion the ghosts stand in a row for a few seconds instead. The Yatzy
 * Sparkles and the sticker floats are separate layers and keep working.
 */
export function GhostParade({ id, name, reduced, onDone, art = PARADE_ART }: Props) {
  const plan = useMemo(() => paradePlan(), []);

  useEffect(() => {
    const t = window.setTimeout(onDone, paradeDuration(plan.length, reduced));
    return () => window.clearTimeout(t);
    // A new parade (new id) restarts the clock.
  }, [id, reduced, onDone, plan.length]);

  return (
    <div className={`parade${reduced ? ' still' : ''}`} data-testid="ghost-parade">
      <p className="sr-only" role="status">
        {paradeAnnouncement(name)}
      </p>
      <div className="parade-line" aria-hidden="true">
        {art ? (
          <img className="parade-strip" src={art} alt="" draggable={false} />
        ) : (
          plan.map((g) => (
            <span
              key={g.index}
              className="parade-ghost"
              style={{
                ['--delay' as string]: `${g.delayMs}ms`,
                ['--bob' as string]: `${g.bobMs}ms`,
                ['--bob-offset' as string]: `${g.bobOffsetMs}ms`,
                ['--scale' as string]: g.scale,
                ['--slot' as string]: g.index,
              }}
            >
              <span className="parade-bob">
                <svg viewBox="0 -2 120 124" width="100%" height="100%" focusable="false">
                  <GhostBody hat={g.hat} />
                </svg>
              </span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
