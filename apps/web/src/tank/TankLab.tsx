/**
 * A development-only bench for the aquarium (`?tank` on the dev server, or a
 * build made with VITE_LAB=1). It shows the active player's tank the size it
 * will be at the table, with your own small tank in its corner, and buttons
 * for the events the game will send.
 */
import { useRef, useState } from 'react';
import { Corner } from '../Corner';
import { SHOWCASE, STARTER } from './catalog';
import { Tank, type TankHandle } from './Tank';

const LAYOUTS = { showcase: SHOWCASE, starter: STARTER } as const;

export function TankLab() {
  const theirs = useRef<TankHandle>(null);
  const mine = useRef<TankHandle>(null);
  const [which, setWhich] = useState<keyof typeof LAYOUTS>('showcase');
  const [evening, setEvening] = useState(false);
  const both = (f: (t: TankHandle) => void) => {
    if (theirs.current) f(theirs.current);
    if (mine.current) f(mine.current);
  };

  return (
    <>
      <Corner />
      <main className="screen tank-lab">
        <h1 className="wordmark">Aquarium</h1>
        <p className="quiet">
          A prototype of the tank beside the dice. Tap the glass to startle them.
        </p>

        <div className="tank-stage">
          <figure className="aquarium">
            <div className="aquarium-lid" aria-hidden="true" />
            <div className="aquarium-glass">
              <Tank
                ref={theirs}
                layout={LAYOUTS[which]}
                seed={3}
                evening={evening}
                label="Mom's tank"
              />
            </div>
            <div className="aquarium-stand" aria-hidden="true" />
            <figcaption className="aquarium-label">Mom&rsquo;s tank</figcaption>
          </figure>
          <figure className="aquarium mini">
            <div className="aquarium-glass">
              <Tank ref={mine} layout={STARTER} seed={8} evening={evening} label="Your tank" />
            </div>
            <figcaption className="aquarium-label">Your tank</figcaption>
          </figure>
        </div>

        <div className="tank-controls">
          <button type="button" className="primary" onClick={() => both((t) => t.feed())}>
            Feed
          </button>
          <button type="button" onClick={() => theirs.current?.celebrate()}>
            Roll a Yatzy
          </button>
          <button type="button" onClick={() => theirs.current?.welcome()}>
            It&rsquo;s your turn
          </button>
          <button type="button" aria-pressed={evening} onClick={() => setEvening((e) => !e)}>
            {evening ? 'Daylight' : 'Evening'}
          </button>
          <button
            type="button"
            onClick={() => setWhich((w) => (w === 'showcase' ? 'starter' : 'showcase'))}
          >
            {which === 'showcase' ? 'Show the starter tank' : 'Show a full tank'}
          </button>
        </div>
      </main>
    </>
  );
}
