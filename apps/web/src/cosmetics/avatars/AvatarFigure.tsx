/**
 * One player's little avatar. Draws through the shared WebGL stage (see stage.ts) when this
 * browser has a real GPU, and as a flat SVG otherwise, or until the 3D side has loaded.
 */
import { useEffect, useRef, useState } from 'react';
import type { Equipped, TintId } from '@rollhouse/shared';
import { tintOf } from '../../tint';
import { usePrefs } from '../../theme/prefs';
import { hasWebGL, renderQuality } from '../../dice/webgl';
import type { MoodCue } from './animation';
import { FlatAvatar } from './FlatAvatar';
import { avatarLookOf, lookKey } from './items';
import type { AvatarHandle } from './stage';
import './avatars.css';

/** True where the 3D avatar can run: WebGL, and not a software renderer. Asked once per page. */
export const avatars3d = (): boolean => hasWebGL() && renderQuality() === 'high';

interface Props {
  equipped?: Equipped | undefined;
  tint?: TintId | undefined;
  /** Side length in CSS pixels. */
  size: number;
  /** The latest mood to play (a new nonce plays it again). */
  cue?: MoodCue | null | undefined;
  /** Varies the idle beat between avatars; use the seat number. */
  seed?: number;
}

export function AvatarFigure({ equipped, tint, size, cue = null, seed = 0 }: Props) {
  const { reducedMotion } = usePrefs();
  const look = avatarLookOf(equipped);
  const hue = tintOf(tint).hue;
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<AvatarHandle | null>(null);
  const latest = useRef({ look, hue, cue, reducedMotion });
  latest.current = { look, hue, cue, reducedMotion };
  const [live, setLive] = useState(false);
  const want3d = avatars3d();

  useEffect(() => {
    if (!want3d) return;
    let gone = false;
    void import('./stage').then(({ addAvatar }) => {
      const el = canvas.current;
      if (gone || !el) return;
      const h = addAvatar(el, seed, () => setLive(false));
      if (!h) return;
      handle.current = h;
      const now = latest.current;
      h.setReduced(now.reducedMotion);
      h.setLook(now.look, now.hue);
      h.setCue(now.cue);
      setLive(true);
    });
    return () => {
      gone = true;
      handle.current?.remove();
      handle.current = null;
      setLive(false);
    };
  }, [want3d, seed]);

  const key = lookKey(look);
  useEffect(() => {
    handle.current?.setLook(latest.current.look, hue);
  }, [key, hue, live]);
  useEffect(() => {
    handle.current?.setReduced(reducedMotion);
  }, [reducedMotion, live]);
  useEffect(() => {
    handle.current?.setCue(cue);
  }, [cue, live]);

  const px = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const flatMood = !live && !reducedMotion && cue ? ` mood-${cue.mood}` : '';
  return (
    <span
      className="avatar-figure"
      style={{ width: size, height: size }}
      data-live={live ? '3d' : 'flat'}
      aria-hidden="true"
    >
      {!live && (
        <span
          key={cue?.nonce ?? 0}
          className={`avatar-flat${reducedMotion ? '' : ' idle'}${flatMood}`}
          style={{ animationDelay: `${-(seed % 5) * 0.7}s` }}
        >
          <FlatAvatar look={look} tintHex={hue} />
        </span>
      )}
      <canvas
        ref={canvas}
        width={Math.round(size * px)}
        height={Math.round(size * px)}
        hidden={!live}
      />
    </span>
  );
}
