/**
 * A development-only bench for the avatars (`?avatars` on the dev server or in a VITE_LAB=1 build):
 * the bare blob and every hat, face, held item and aura, with buttons to play the moods.
 * `?quality=low` shows the flat fallback. Nothing here is in production builds.
 */
import { useState } from 'react';
import { CATALOG, type Equipped, type Slot, type TintId } from '@rollhouse/shared';
import { TINTS } from '../../theme/palette';
import { AvatarFigure, avatars3d } from './AvatarFigure';
import { clockNow, type Mood, type MoodCue } from './animation';
import './avatars.css';

const SLOT_ORDER: Slot[] = ['hair', 'hat', 'face', 'held', 'aura'];
const TINT_IDS = Object.keys(TINTS) as TintId[];

/** Everything at once, to see the items together. */
const EVERYTHING: Equipped = {
  hat: 'witchHat',
  face: 'glasses',
  held: 'wand',
  aura: 'sparkles',
};

export function AvatarBench() {
  const [tint, setTint] = useState<TintId>('heather');
  const [cue, setCue] = useState<MoodCue | null>(null);
  const play = (mood: Mood) => setCue({ mood, nonce: (cue?.nonce ?? 0) + 1, at: clockNow() });

  return (
    <main className="screen lab avatar-bench">
      <h1>Avatars</h1>
      <p className="quiet">
        Drawn {avatars3d() ? 'in 3D on one shared renderer' : 'flat (no GPU, or ?quality=low)'}.
      </p>
      <div className="action-row bench-row" role="group" aria-label="Avatar controls">
        <button type="button" onClick={() => play('happy')}>
          Happy bounce
        </button>
        <button type="button" onClick={() => play('droop')}>
          Droop
        </button>
        <label>
          Tint{' '}
          <select value={tint} onChange={(e) => setTint(e.target.value as TintId)}>
            {TINT_IDS.map((id) => (
              <option key={id} value={id}>
                {TINTS[id].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="bench-grid">
        <Cell label="Bare blob" equipped={{}} tint={tint} cue={cue} seed={0} />
        <Cell label="Everything" equipped={EVERYTHING} tint={tint} cue={cue} seed={1} />
        {SLOT_ORDER.flatMap((slot) =>
          CATALOG.filter((i) => i.slot === slot).map((i, n) => (
            <Cell
              key={i.id}
              label={`${slot}: ${i.name}`}
              equipped={{ [slot]: i.id }}
              tint={tint}
              cue={cue}
              seed={n + 2}
            />
          )),
        )}
      </ul>
    </main>
  );
}

function Cell(props: {
  label: string;
  equipped: Equipped;
  tint: TintId;
  cue: MoodCue | null;
  seed: number;
}) {
  return (
    <li className="bench-cell">
      <AvatarFigure
        equipped={props.equipped}
        tint={props.tint}
        size={128}
        cue={props.cue}
        seed={props.seed}
      />
      <span>{props.label}</span>
    </li>
  );
}
