import type { Equipped } from '@rollhouse/shared';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lookOf } from '../cosmetics/look';
import { SCHEMES } from '../theme/palette';
import { usePrefs } from '../theme/prefs';
import { playCelebrate, playHop, playImpact, playRattle, playSettle } from '../sound';
import { Sparkles } from '../Sparkles';
import type { SceneProps, SlotRect } from './DiceScene';
import { STAGE_ASPECT } from './framing';
import { loadTumbles, tumblesNow } from './loadTumbles';
import type { Quat } from './quat';
import {
  celebrationFor,
  type HopPlan,
  type RollPlan,
  rollSounds,
  settledQuat,
  SHAKE_EASE,
  timing,
} from './timeline';
import { CUP, PATHS_PER_COUNT } from './tumbleFormat';
import { hasWebGL } from './webgl';

const DiceScene = lazy(() => import('./DiceScene'));

/** A roll to animate: one per roll move, from the live message stream. */
export interface RollEvent {
  /** The move's index in the log; settles are reported by it. */
  index: number;
  tumble: number;
  /** The turn's first roll: no dice to scoop up first. */
  first: boolean;
}

interface Props {
  values: readonly (number | null)[];
  held: readonly boolean[];
  /** The latest roll of the player shown, or null. */
  roll: RollEvent | null;
  /** Click a die to hold or release it; null when the viewer can't. */
  onToggle: ((die: number) => void) | null;
  onSettled(index: number): void;
  /** The roller's tint: the cup they shake. */
  hue: string;
  rolling: boolean;
  /**
   * Roll is being held down (since `start`): the cup comes out and rattles
   * until the roll arrives, which then picks up from the shake.
   */
  shake?: { start: number } | null;
  /** What the player whose tray this is has on: their dice skin and cauldron brew. */
  equipped?: Equipped | undefined;
}

const PIP_SPOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A flat die, for screens without WebGL. */
export function FlatFace({ value }: { value: number | null }) {
  return (
    <span className="flat-die" aria-hidden="true">
      {value !== null &&
        Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={PIP_SPOTS[value]!.includes(i) ? 'pip' : 'pip off'} />
        ))}
    </span>
  );
}

/** Pan from -1 to 1 by where something is across the tray. */
const panOf = (x: number) => x / 5;

/** Rattle sounds are queued this far ahead while Roll is held. */
const RATTLE_CHUNK = 120;

export function DiceTray({
  values,
  held,
  roll,
  onToggle,
  onSettled,
  hue,
  rolling,
  shake = null,
  equipped,
}: Props) {
  const { prefs, theme, reducedMotion } = usePrefs();
  const three = hasWebGL();
  const [plan, setPlan] = useState<RollPlan | null>(null);
  const [hops, setHops] = useState<HopPlan[]>([]);
  const [slots, setSlots] = useState<{ tray: SlotRect[]; shelf: SlotRect[] } | null>(null);
  const [party, setParty] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const lastRoll = useRef<number>(roll?.index ?? -1);
  const prevHeld = useRef(held);
  const speed = prefs.fastRolls ? 0.5 : 1;
  // How each die lies, kept between rolls so nothing snaps when a roll ends.
  const rests = useRef<{ value: number | null; quat: Quat }[]>([]);
  const restsNow = useMemo(
    () =>
      values.map((v, i) => {
        const r = rests.current[i];
        return r && r.value === v ? r.quat : null;
      }),
    [values, plan],
  );
  const rattleUntil = useRef(0);
  const rattleLoop = useRef<number | undefined>(undefined);

  // Roll held down: the free dice go into the cup and it rattles until the roll comes back.
  const free = held.flatMap((h, i) => (h ? [] : [i]));
  const pending = useMemo<RollPlan | null>(() => {
    if (!shake || reducedMotion || !three || !tumblesNow() || free.length === 0) return null;
    return {
      start: shake.start,
      values: values.map((v) => v ?? 1),
      free,
      held,
      hadDice: free.some((i) => values[i] !== null),
      path: null,
      mirror: false,
      speed,
      reduced: false,
      before: restsNow,
    };
    // A new shake starts this; nothing else may change while Roll is held.
  }, [shake?.start]);

  useEffect(() => {
    if (!pending) return;
    const t = timing(pending);
    for (const s of rollSounds(pending)) {
      playImpact(s.at - performance.now(), 'cup', s.strength, panOf(s.x));
    }
    rattleUntil.current = t.shakeStart;
    // Queue the rattle a little at a time, so it stops soon after the roll arrives.
    const tick = () => {
      const now = performance.now();
      while (rattleUntil.current < now + RATTLE_CHUNK * 1.5) {
        const from = Math.max(now, rattleUntil.current);
        playRattle(from - now, RATTLE_CHUNK, pending.free.length, panOf(CUP.x));
        rattleUntil.current = from + RATTLE_CHUNK;
      }
    };
    tick();
    rattleLoop.current = window.setInterval(tick, RATTLE_CHUNK / 2);
    return () => window.clearInterval(rattleLoop.current);
  }, [pending]);

  useEffect(() => void (three && loadTumbles()), [three]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finish = useCallback(
    (index: number) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      onSettled(index);
    },
    [onSettled],
  );

  // A new roll: build the plan, schedule its sounds and the settle.
  useEffect(() => {
    if (!roll || roll.index <= lastRoll.current) return;
    lastRoll.current = roll.index;
    window.clearInterval(rattleLoop.current);
    const tumbles = tumblesNow();
    const reduced = reducedMotion || !three || !tumbles || free.length === 0;
    const now = performance.now();
    // After a held shake, the roll carries on from it: same start, rattling until now.
    const held_ = pending && !reduced ? pending : null;
    const next: RollPlan = {
      start: held_ ? held_.start : now,
      values: values.map((v) => v ?? 1),
      free,
      held,
      hadDice: held_ ? held_.hadDice : !roll.first,
      path: reduced ? null : (tumbles?.[free.length - 1]?.[roll.tumble % PATHS_PER_COUNT] ?? null),
      mirror: Math.floor(roll.tumble / PATHS_PER_COUNT) % 2 === 1,
      speed,
      reduced,
      // The values have already changed, so take each die as it last lay.
      before: held_ ? held_.before : values.map((_, i) => rests.current[i]?.quat ?? null),
      // Wind the rattle down from where it is, then pour.
      shakeUntil: held_ ? now + SHAKE_EASE * speed : undefined,
    };
    values.forEach((v, i) => (rests.current[i] = { value: v, quat: settledQuat(next, i) }));
    setPlan(next);
    setHops([]);
    setHover(null);
    const t = timing(next);
    const at = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, Math.max(0, ms - now)));
    if (!next.reduced) {
      // The rest of the rattle (a held shake has already played its share), then the roll.
      const from = Math.max(now, t.shakeStart, held_ ? rattleUntil.current : 0);
      if (t.shakeEnd > from) {
        playRattle(from - now, t.shakeEnd - from, free.length, panOf(CUP.x));
      }
      let step = 0;
      for (const s of rollSounds(next)) {
        if (s.at < now - 20) continue;
        const delay = s.at - now;
        if (s.kind === 'pop') playSettle(delay, step++, panOf(s.x));
        else playImpact(delay, s.kind, s.strength, panOf(s.x));
      }
    }
    const kind = celebrationFor(next.values);
    if (kind === 'yatzy') {
      at(t.celebrate, () => {
        playCelebrate();
        setParty(roll.index);
      });
      at(t.celebrate + 1500, () => setParty(null));
    }
    at(t.end, () => onSettled(roll.index));
    at(t.done + 100, () => setPlan(null));
    // Only a new roll starts this; values and held arrive in the same render.
  }, [roll]);

  // A hold or release with no roll: hop the die between tray and shelf.
  useEffect(() => {
    const before = prevHeld.current;
    prevHeld.current = held;
    const changed = held.flatMap((h, i) => (h !== before[i] ? [i] : []));
    if (changed.length === 0 || changed.length > 2 || rolling) return;
    const now = performance.now();
    setHops((hs) => [
      ...hs.filter((h) => !changed.includes(h.die)),
      ...changed.map((die) => ({
        start: now,
        die,
        value: values[die] ?? 1,
        toShelf: held[die]!,
        speed,
        reduced: reducedMotion || !three,
        quat: restsNow[die] ?? undefined,
      })),
    ]);
    if (!reducedMotion && three) playHop(260 * speed, held[changed[0]!]!);
  }, [held]);

  /** Click the tray to skip ahead. */
  const skip = () => {
    if (!plan || !rolling) return;
    setPlan(null);
    finish(lastRoll.current);
  };

  const sceneProps: SceneProps = {
    values,
    held,
    roll: plan ?? pending,
    hops,
    colors: SCHEMES[prefs.scheme].themes[theme],
    scene: SCHEMES[prefs.scheme].scene[theme],
    hue,
    hover,
    rests: restsNow,
    look: { ...lookOf(equipped), reduced: reducedMotion },
    onSlots: setSlots,
  };
  // Flat layout without WebGL, and while the 3D scene loads.
  const flat = !three || !slots;
  // While the scene loads, show nothing rather than a flash of blank flat dice.
  const loading = three && !slots;

  return (
    <div
      className={`dice-stage${flat ? ' flat' : ''}${loading ? ' loading' : ''}`}
      data-testid="dice-tray"
      onClick={skip}
      style={{ ['--hue' as string]: hue, ['--stage-aspect' as string]: STAGE_ASPECT }}
    >
      {three && (
        <div className="scene">
          <Suspense fallback={null}>
            <DiceScene {...sceneProps} />
          </Suspense>
        </div>
      )}
      <div className="die-buttons">
        {[0, 1, 2, 3, 4].map((i) => {
          const value = values[i] ?? null;
          const isHeld = held[i] ?? false;
          const label =
            value === null
              ? `Die ${i + 1}, not rolled`
              : rolling && !isHeld
                ? `Die ${i + 1}, rolling`
                : `Die ${i + 1}: ${value}`;
          const spot = slots?.[isHeld ? 'shelf' : 'tray'][i];
          const disabled = !onToggle || value === null || rolling;
          return (
            <button
              key={i}
              type="button"
              className={`die${isHeld ? ' held' : ''}`}
              aria-label={isHeld ? `${label}, held` : label}
              aria-pressed={isHeld}
              aria-keyshortcuts={String(i + 1)}
              disabled={disabled}
              onPointerEnter={() => !disabled && setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                setHover(null);
                onToggle?.(i);
              }}
              style={
                !flat && spot
                  ? {
                      left: `${spot.x * 100}%`,
                      top: `${spot.y * 100}%`,
                      width: `${spot.size * 100}%`,
                    }
                  : { order: isHeld ? i : 10 + i }
              }
            >
              {!three && <FlatFace value={rolling && !isHeld ? null : value} />}
            </button>
          );
        })}
      </div>
      {party !== null && (
        <div className="celebrate" aria-hidden="true">
          <Sparkles colors={[hue, 'var(--accent)', 'var(--strong)', 'var(--on-band)']} count={30} />
          <strong className="celebrate-word">Yatzy!</strong>
        </div>
      )}
    </div>
  );
}
