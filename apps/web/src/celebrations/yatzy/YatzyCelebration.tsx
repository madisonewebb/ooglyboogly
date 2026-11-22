import { useEffect, useMemo } from 'react';
import { bannerLine, celebrationDuration, confettiPlan, ringAngles, type Piece } from './plan';
import './yatzy.css';

interface Props {
  /** Changes for each celebration, so a second one starts over. */
  id: number;
  /** Who rolled the Yatzy (display names). */
  names: readonly string[];
  reduced: boolean;
  /** It has played out. */
  onDone(): void;
}

const style = (p: Piece) =>
  ({
    '--bx': `${p.burstX}vw`,
    '--by': `${p.burstY}vh`,
    '--fx': `${p.fallX}vw`,
    '--fy': `${p.fallY}vh`,
    '--turns': `${p.turns * 360}deg`,
    '--delay': `${p.delayMs}ms`,
    '--size': `${p.size}rem`,
  }) as React.CSSProperties;

/**
 * The big default celebration for a Yatzy: a burst of palette-colored confetti,
 * a large YATZY! banner naming the roller, and a soft glow and a small shake of
 * the tray. It sits over everything, takes no clicks (play carries on beneath
 * it), is pure CSS motion with about 54 pieces, and removes itself. With reduced
 * motion there is no flying and no shake: the banner and a still ring of stars
 * stay for 2.5 seconds. The banner is the one thing announced, politely.
 */
export function YatzyCelebration({ id, names, reduced, onDone }: Props) {
  const pieces = useMemo(() => confettiPlan(), []);
  const ring = useMemo(() => ringAngles(), []);

  useEffect(() => {
    const t = window.setTimeout(onDone, celebrationDuration(reduced));
    return () => window.clearTimeout(t);
    // A new celebration (new id) restarts the clock.
  }, [id, reduced, onDone]);

  // The tray glows and shakes through a flag on the page, so the screen file stays small.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset['yatzy'] = reduced ? 'still' : 'burst';
    return () => {
      delete root.dataset['yatzy'];
    };
  }, [id, reduced]);

  return (
    <div className={`yatzy${reduced ? ' still' : ''}`} data-testid="yatzy-celebration">
      <div className="yatzy-glow" aria-hidden="true" />
      {reduced ? (
        <div className="yatzy-ring" aria-hidden="true">
          {ring.map((deg) => (
            <span key={deg} className="yatzy-star" style={{ ['--angle' as string]: `${deg}deg` }} />
          ))}
        </div>
      ) : (
        <div className="yatzy-confetti" aria-hidden="true">
          {pieces.map((p) => (
            <span
              key={p.index}
              className={`yatzy-piece ${p.shape}`}
              data-color={p.color}
              style={style(p)}
            />
          ))}
        </div>
      )}
      <div className="yatzy-banner" role="status" aria-live="polite" aria-atomic="true">
        <span className="yatzy-word" aria-hidden="true">
          YATZY!
        </span>
        <span className="yatzy-who">{bannerLine(names)}</span>
      </div>
    </div>
  );
}
