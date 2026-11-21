/**
 * A development-only bench for the dice (`?lab` on the dev server): force any
 * roll and replay it, to tune the tumble, the sounds and the celebrations.
 * URL options: values=6,6,6,6,6 held=00000 tumble=12 first=1 auto=1 shake=1
 * (hold the cauldron out) cosmetics=diceSkin:gilded,brew:witchfire.
 */
import { BREWS as BREW_ITEMS, DICE_SKINS } from '@rollhouse/shared';
import { useEffect, useState } from 'react';
import { devCosmetics } from './cosmetics/devCosmetics';
import './cosmetics/cosmetics.css';
import { DiceTray, type RollEvent } from './dice/DiceTray';
import { TINTS } from './theme/palette';
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
  const start = devCosmetics();
  const [skin, setSkin] = useState(start?.diceSkin ?? '');
  const [brew, setBrew] = useState(start?.brew ?? '');
  // Holding the cauldron out keeps it rattling, so a brew can be looked at (and photographed).
  const [hold, setHold] = useState<{ start: number } | null>(null);
  // The tumble paths load in the background; wait for them before holding the cauldron out.
  useEffect(() => {
    if (q.get('shake') !== '1') return;
    const id = window.setTimeout(() => setHold({ start: performance.now() }), 1500);
    return () => window.clearTimeout(id);
  }, []);
  const equipped = {
    ...(skin ? { diceSkin: skin } : {}),
    ...(brew ? { brew } : {}),
  };
  const go = (first = q.get('first') === '1', now = text) => {
    unlockAudio();
    const next = parse(now, values);
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
            hue={TINTS.heather.hue}
            shake={hold}
            equipped={equipped}
          />
          <div className="action-row">
            <input aria-label="Values" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="button" className="primary" onClick={() => go()}>
              Roll {tumble}
            </button>
            <button type="button" onClick={() => go(true)}>
              First roll
            </button>
            <button
              type="button"
              onClick={() => {
                setText('6,6,6,6,6');
                go(false, '6,6,6,6,6');
              }}
            >
              Yatzy
            </button>
          </div>
          <div className="lab-cosmetics">
            <label>
              Dice skin
              <select value={skin} onChange={(e) => setSkin(e.target.value)}>
                <option value="">Default (porcelain)</option>
                {DICE_SKINS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brew
              <select value={brew} onChange={(e) => setBrew(e.target.value)}>
                <option value="">Default (empty)</option>
                {BREW_ITEMS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="lab-check">
              <input
                type="checkbox"
                checked={hold !== null}
                onChange={(e) => setHold(e.target.checked ? { start: performance.now() } : null)}
              />
              Hold the cauldron out
            </label>
          </div>
        </section>
      </div>
    </main>
  );
}
