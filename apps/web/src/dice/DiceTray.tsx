import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THEMES } from '../theme/palette';
import { usePrefs } from '../theme/prefs';
import { playCelebrate, playClack, playRattle } from '../sound';
import type { SceneProps, SlotRect } from './DiceScene';
import { STAGE_ASPECT } from './framing';
import { loadTumbles, tumblesNow } from './loadTumbles';
import { celebrationFor, type HopPlan, landTimes, type RollPlan, timing } from './timeline';
import { PATHS_PER_COUNT } from './tumbleFormat';

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
  /** Tap a die to hold or release it; null when the viewer can't. */
  onToggle: ((die: number) => void) | null;
  onSettled(index: number): void;
  /** Sprinkle color: the roller's candy shade. */
  candy: string;
  rolling: boolean;
}

let webgl: boolean | null = null;
function hasWebGL(): boolean {
  if (webgl === null) {
    try {
      webgl = !!document.createElement('canvas').getContext('webgl2');
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

const PIP_SPOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A flat jelly die, for screens without WebGL and while the 3D scene loads. */
function FlatFace({ value }: { value: number | null }) {
  return (
    <span className="flat-die" aria-hidden="true">
      {value !== null &&
        Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={PIP_SPOTS[value]!.includes(i) ? 'pip' : 'pip off'} />
        ))}
    </span>
  );
}

function Sprinkles({ color, id }: { color: string; id: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        angle: (i / 36) * Math.PI * 2 + ((id * 7 + i * 13) % 10) / 20,
        dist: 90 + ((i * 37 + id) % 70),
        rot: (i * 47) % 360,
        delay: (i % 6) * 18,
      })),
    [id],
  );
  return (
    <div className="sprinkles" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            background: i % 3 === 0 ? 'var(--butter)' : color,
            ['--dx' as string]: `${Math.cos(b.angle) * b.dist}px`,
            ['--dy' as string]: `${Math.sin(b.angle) * b.dist}px`,
            ['--rot' as string]: `${b.rot}deg`,
            animationDelay: `${b.delay}ms`,
          }}
        />
      ))}
      <strong className="celebrate-word">Yatzy!</strong>
    </div>
  );
}

export function DiceTray({ values, held, roll, onToggle, onSettled, candy, rolling }: Props) {
  const { prefs, theme, reducedMotion } = usePrefs();
  const three = hasWebGL();
  const [plan, setPlan] = useState<RollPlan | null>(null);
  const [hops, setHops] = useState<HopPlan[]>([]);
  const [slots, setSlots] = useState<{ tray: SlotRect[]; shelf: SlotRect[] } | null>(null);
  const [party, setParty] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const lastRoll = useRef<number>(roll?.index ?? -1);
  const prevHeld = useRef(held);
  const speed = prefs.fastRolls ? 0.5 : 1;

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
    const free = held.flatMap((h, i) => (h ? [] : [i]));
    const tumbles = tumblesNow();
    const reduced = reducedMotion || !three || !tumbles || free.length === 0;
    const next: RollPlan = {
      start: performance.now(),
      values: values.map((v) => v ?? 1),
      free,
      held,
      hadDice: !roll.first,
      path: tumbles?.[free.length - 1]?.[roll.tumble % PATHS_PER_COUNT] ?? [],
      speed,
      reduced,
    };
    setPlan(next);
    setHops([]);
    const t = timing(next);
    const at = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, Math.max(0, ms - next.start)));
    if (!reduced) {
      playRattle(t.shakeEnd - next.start);
      landTimes(next).forEach((ms, i) => playClack(ms - next.start, 1 - i * 0.08));
      t.settled.forEach((ms) => playClack(ms - next.start, 0.35));
    }
    const kind = celebrationFor(next.values);
    if (kind === 'yatzy') {
      at(t.end, () => {
        playCelebrate();
        setParty(roll.index);
      });
      at(t.end + 1400, () => setParty(null));
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
      })),
    ]);
    if (!reducedMotion && three) playClack(250 * speed, 0.3);
  }, [held]);

  /** Tap the tray to skip ahead. */
  const skip = () => {
    if (!plan || !rolling) return;
    setPlan(null);
    finish(lastRoll.current);
  };

  const colors = THEMES[theme];
  const sceneProps: SceneProps = { values, held, roll: plan, hops, colors, onSlots: setSlots };
  // Flat dice only without WebGL; while the 3D scene loads, the stage keeps its shape.
  const flat = !three;
  const loading = three && !slots;

  return (
    <div
      className={`dice-stage${flat ? ' flat' : ''}${loading ? ' loading' : ''}`}
      data-testid="dice-tray"
      onClick={skip}
      style={{ ['--candy' as string]: candy, ['--stage-aspect' as string]: STAGE_ASPECT }}
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
          return (
            <button
              key={i}
              type="button"
              className={`die${isHeld ? ' held' : ''}`}
              aria-label={isHeld ? `${label}, held` : label}
              aria-pressed={isHeld}
              disabled={!onToggle || value === null || rolling}
              onClick={(e) => {
                e.stopPropagation();
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
              {flat && <FlatFace value={rolling && !isHeld ? null : value} />}
            </button>
          );
        })}
      </div>
      {party !== null && <Sprinkles color={candy} id={party} />}
    </div>
  );
}
