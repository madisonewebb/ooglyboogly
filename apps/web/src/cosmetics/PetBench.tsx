/**
 * A development-only bench for pets and the Ghost Parade (`?pets` on the dev
 * server or in a VITE_LAB=1 build): pick a pet, trigger every pose or the
 * parade, and see the whole set side by side. Keys: 1 idle, 2 happy, 3 sad,
 * 4 cheer, P parade. URL: ?pets&cosmetics=pet:bat&pose=sad&hold=1 (hold: stay
 * in the pose instead of settling back to idle) and &parade=1 (start the parade).
 */
import { useCallback, useEffect, useState } from 'react';
import { itemById } from '@rollhouse/shared';
import { DiceTray } from '../dice/DiceTray';
import { GhostParade } from './celebrations/GhostParade';
import { usePrefs } from '../theme/prefs';
import { TINTS } from '../theme/palette';
import { devOverride } from './devOverride';
import {
  PET_IDS,
  PET_POSES,
  type PetId,
  type PetPose,
  POSES,
  REACTION_MS,
  isPetId,
} from './pets/mood';
import { PetLayer } from './pets/PetLayer';
import { PetSprite } from './pets/PetSprite';
import './pets/pets.css';
import './pets/bench.css';

const q = new URLSearchParams(location.search);
const nameOf = (id: PetId) => itemById(id)?.name ?? id;
const KEYS: Record<string, PetPose> = { '1': 'idle', '2': 'happy', '3': 'sad', '4': 'cheer' };

export function PetBench() {
  const { reducedMotion } = usePrefs();
  const fromUrl = devOverride().pet;
  const [pet, setPet] = useState<PetId>(isPetId(fromUrl) ? fromUrl : 'toad');
  const startPose = q.get('pose');
  const [pose, setPose] = useState<PetPose>(
    (POSES as readonly string[]).includes(startPose ?? '') ? (startPose as PetPose) : 'idle',
  );
  const [nonce, setNonce] = useState(0);
  const hold = q.get('hold') === '1';
  // The Ghost Parade: 0 is off, anything else is the id of the one playing.
  const [parade, setParade] = useState(q.get('parade') === '1' ? 1 : 0);
  const endParade = useCallback(() => setParade(0), []);

  const react = (next: PetPose) => {
    setPose(next);
    setNonce((n) => n + 1);
  };

  // Settle back to idle after a reaction, like the game does, unless holding for a screenshot.
  useEffect(() => {
    if (hold || pose === 'idle') return;
    const id = setTimeout(() => setPose('idle'), REACTION_MS[pose]);
    return () => clearTimeout(id);
  }, [pose, nonce, hold]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const next = KEYS[e.key];
      if (next) react(next);
      else if (e.key === 'p' || e.key === 'P') setParade((n) => n + 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="screen game lab pet-bench">
      <div className="table-layout">
        <section className="tray-col">
          <div className="pet-anchor">
            <DiceTray
              values={[3, 3, 5, 6, 1]}
              held={[false, false, true, false, false]}
              roll={null}
              rolling={false}
              onToggle={null}
              onSettled={() => undefined}
              hue={TINTS.heather.hue}
            />
            <PetLayer pet={pet} owner={0} pose={pose} nonce={nonce} reduced={reducedMotion} />
          </div>
          <div className="action-row bench-row" role="group" aria-label="Pet">
            {PET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === pet}
                className={id === pet ? 'primary' : ''}
                onClick={() => setPet(id)}
              >
                {nameOf(id)}
              </button>
            ))}
          </div>
          <div className="action-row bench-row" role="group" aria-label="Pose">
            {POSES.map((p, i) => (
              <button key={p} type="button" onClick={() => react(p)}>
                {p} <kbd aria-hidden="true">{i + 1}</kbd>
              </button>
            ))}
            <button type="button" onClick={() => setParade((n) => n + 1)}>
              Ghost parade <kbd aria-hidden="true">P</kbd>
            </button>
          </div>
        </section>
      </div>
      <section className="bench-gallery" aria-label="Every pet and pose">
        {PET_IDS.map((id) => (
          <div key={id} className="bench-set" data-set={id}>
            <h2>{nameOf(id)}</h2>
            <div className="bench-poses">
              {PET_POSES[id].map((p) => (
                <figure key={p} data-pet={id} data-pose={p}>
                  <div className="bench-sprite">
                    <PetSprite pet={id} pose={p} />
                  </div>
                  <figcaption>{p}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </section>
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
