/**
 * A development-only bench for the celebrations (`?celebrations` on the dev
 * server or in a VITE_LAB=1 build): the Ghost Parade (key P, or &parade=1) and
 * the big Yatzy celebration (see YatzyBench). Nothing here is in production builds.
 */
import { useCallback, useEffect, useState } from 'react';
import { DiceTray } from '../dice/DiceTray';
import { GhostParade } from './celebrations/GhostParade';
import { YatzyBench } from '../celebrations/yatzy/YatzyBench';
import { usePrefs } from '../theme/prefs';
import { TINTS } from '../theme/palette';
import './bench.css';

const q = new URLSearchParams(location.search);

export function CelebrationBench() {
  const { reducedMotion } = usePrefs();
  // The Ghost Parade: 0 is off, anything else is the id of the one playing.
  const [parade, setParade] = useState(q.get('parade') === '1' ? 1 : 0);
  const endParade = useCallback(() => setParade(0), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') setParade((n) => n + 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="screen game lab celebration-bench">
      <div className="table-layout">
        <section className="tray-col">
          <DiceTray
            values={[3, 3, 5, 6, 1]}
            held={[false, false, true, false, false]}
            roll={null}
            rolling={false}
            onToggle={null}
            onSettled={() => undefined}
            hue={TINTS.heather.hue}
          />
          <div className="action-row bench-row" role="group" aria-label="Celebrations">
            <button type="button" onClick={() => setParade((n) => n + 1)}>
              Ghost parade <kbd aria-hidden="true">P</kbd>
            </button>
          </div>
          <YatzyBench />
        </section>
      </div>
      {parade > 0 && (
        <GhostParade
          key={parade}
          id={parade}
          name="Madi"
          reduced={reducedMotion}
          onDone={endParade}
        />
      )}
    </main>
  );
}
