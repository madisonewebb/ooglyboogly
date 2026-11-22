/**
 * The Yatzy celebration on the dev bench (`?pets`, dev server and VITE_LAB=1
 * builds only; this file is imported only by the bench, so it is not in
 * production). A roller name field, a Yatzy button and the key Y. URL:
 * ?pets&yatzy=1&roller=Madi starts it on load. It owns its own state, so
 * playing it re-renders nothing else on the page, like the real thing.
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { playYatzyFanfare, unlockAudio } from '../../sound';
import { usePrefs } from '../../theme/prefs';
import { YatzyCelebration } from './YatzyCelebration';

const q = new URLSearchParams(location.search);

export function YatzyBench() {
  const { reducedMotion } = usePrefs();
  // 0 is off, anything else is the id of the celebration playing.
  const [id, setId] = useState(q.get('yatzy') === '1' ? 1 : 0);
  const [roller, setRoller] = useState(q.get('roller') ?? 'Madi');
  const end = useCallback(() => setId(0), []);
  const play = useCallback(() => {
    unlockAudio();
    playYatzyFanfare(reducedMotion);
    setId((n) => n + 1);
  }, [reducedMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'y' || e.key === 'Y') && !(e.target instanceof HTMLInputElement)) play();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [play]);

  return (
    <>
      <div className="action-row bench-row" role="group" aria-label="Yatzy celebration">
        <label>
          Roller <input value={roller} onChange={(e) => setRoller(e.target.value)} maxLength={24} />
        </label>
        <button type="button" onClick={play}>
          Yatzy <kbd aria-hidden="true">Y</kbd>
        </button>
      </div>
      {/* On the body, not in the tray column: the column shakes, and a transformed parent
          would turn this fixed overlay into one the size of the column. */}
      {id > 0 &&
        createPortal(
          <YatzyCelebration
            key={id}
            id={id}
            names={[roller.trim() || 'Someone']}
            reduced={reducedMotion}
            onDone={end}
          />,
          document.body,
        )}
    </>
  );
}
