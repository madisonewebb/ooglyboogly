/**
 * A development-only bench for the dice (`?lab` on the dev server): force any
 * roll and replay it, to tune the tumble, the sounds and the celebrations.
 * URL options: values=6,6,6,6,6 held=00000 tumble=12 first=1 auto=1.
 */
import { useState } from 'react';
import { DiceTray, type RollEvent } from './dice/DiceTray';
import { FLAVORS } from './theme/palette';
import { unlockAudio } from './sound';

const q = new URLSearchParams(location.search);
const parse = (s: string | null, d: number[]) => (s ? s.split(',').map(Number) : d);

export function Lab() {
  const [values, setValues] = useState(parse(q.get('values'), [3, 1, 4, 1, 5]));
  const [held, setHeld] = useState((q.get('held') ?? '00000').split('').map((c) => c === '1'));
  const [roll, setRoll] = useState<RollEvent | null>(null);
  const [settled, setSettled] = useState(-1);
  const [tumble, setTumble] = useState(Number(q.get('tumble') ?? 0));
  const [text, setText] = useState(values.join(','));
  const go = (first = q.get('first') === '1') => {
    unlockAudio();
    const next = parse(text, values);
    setValues(next);
    setRoll((r) => ({ index: (r?.index ?? 0) + 1, tumble, first }));
    setTumble((t) => t + 1);
  };
  const rolling = roll !== null && roll.index > settled;
  if (q.get('auto') === '1' && roll === null) setTimeout(() => go(), 600);
  return (
    <main className="screen game lab">
      <div className="table-layout">
        <section className="tray-col">
          <DiceTray
            values={values}
            held={held}
            roll={roll}
            rolling={rolling}
            onToggle={(i) => setHeld((h) => h.map((x, j) => (j === i ? !x : x)))}
            onSettled={(i) => setSettled(i)}
            candy={FLAVORS.grape.candy}
          />
          <div className="action-row">
            <input aria-label="Values" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="button" className="candy" onClick={() => go()}>
              Roll {tumble}
            </button>
            <button type="button" onClick={() => go(true)}>
              First roll
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
