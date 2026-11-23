import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { applyMove, createGame, type GameSetup, type Move } from '@rollhouse/rules';
import { AURAS, FACES, HAIR, HATS, HELD } from '@rollhouse/shared';
import { mixHex } from './colors';
import {
  blinkAt,
  DROOP_SECONDS,
  HAPPY_SECONDS,
  moodActive,
  moodsBetween,
  poseAt,
  REST,
  type MoodCue,
} from './animation';
import { FlatAvatar } from './FlatAvatar';
import {
  AURA_IDS,
  avatarLookOf,
  BARE_LOOK,
  FACE_IDS,
  HAIR_IDS,
  HAT_IDS,
  HELD_IDS,
  lookKey,
} from './items';
import { buildRig } from './model';

const ids = (items: readonly { id: string }[]) => items.map((i) => i.id).sort();

describe('avatar items match the catalog', () => {
  it('draws every item the catalog sells in the five avatar slots, and nothing else', () => {
    expect([...HAIR_IDS].sort()).toEqual(ids(HAIR));
    expect([...HAT_IDS].sort()).toEqual(ids(HATS));
    expect([...FACE_IDS].sort()).toEqual(ids(FACES));
    expect([...HELD_IDS].sort()).toEqual(ids(HELD));
    expect([...AURA_IDS].sort()).toEqual(ids(AURAS));
  });

  it('marks them all available', () => {
    for (const i of [...HAIR, ...HATS, ...FACES, ...HELD, ...AURAS]) expect(i.available).toBe(true);
  });
});

describe('avatarLookOf', () => {
  it('is bare with nothing equipped', () => {
    expect(avatarLookOf(undefined)).toEqual(BARE_LOOK);
    expect(avatarLookOf({})).toEqual(BARE_LOOK);
  });

  it('reads each slot, and ignores unknown ids and ids from another slot', () => {
    expect(
      avatarLookOf({ hair: 'bob', hat: 'crown', face: 'monocle', held: 'wand', aura: 'sparkles' }),
    ).toEqual({
      hair: 'bob',
      hat: 'crown',
      face: 'monocle',
      held: 'wand',
      aura: 'sparkles',
    });
    expect(avatarLookOf({ hat: 'wand', face: 'gone' })).toEqual(BARE_LOOK);
    expect(avatarLookOf({ diceSkin: 'bone', brew: 'swamp' })).toEqual(BARE_LOOK);
  });

  it('gives different looks different keys', () => {
    expect(lookKey(avatarLookOf({ hat: 'bow' }))).not.toBe(lookKey(BARE_LOOK));
  });
});

describe('the 3D model', () => {
  const every = [
    ...HAIR_IDS.map((hair) => ({ ...BARE_LOOK, hair })),
    ...HAT_IDS.map((hat) => ({ ...BARE_LOOK, hat })),
    ...FACE_IDS.map((face) => ({ ...BARE_LOOK, face })),
    ...HELD_IDS.map((held) => ({ ...BARE_LOOK, held })),
    ...AURA_IDS.map((aura) => ({ ...BARE_LOOK, aura })),
    BARE_LOOK,
  ];

  it('builds and poses every item without a GPU', () => {
    for (const look of every) {
      const rig = buildRig(look, '#A07BD6');
      for (const t of [0, 0.4, 2.2]) rig.update(t, poseAt(t, 1, null, false));
      rig.update(1, { ...REST, droop: 1, joy: 1, blink: 1, wobble: 0.2 });
      expect(rig.root.children.length).toBeGreaterThan(0);
      rig.dispose();
    }
  });

  it('stands on little legs: the feet reach the ground, with no hands or feet beyond the limbs', () => {
    const rig = buildRig(BARE_LOOK, '#E0708F');
    rig.update(0, REST);
    rig.root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(rig.root);
    expect(box.min.y).toBeGreaterThan(-0.02);
    expect(box.min.y).toBeLessThan(0.04);
    rig.dispose();
  });

  it('throws the arms up on a cheer, and lets them hang on a droop', () => {
    /** The box around just the two arms (the capsules with the arm radius). */
    const arms = (pose: typeof REST) => {
      const rig = buildRig(BARE_LOOK, '#E0708F');
      rig.update(0, pose);
      rig.root.updateMatrixWorld(true);
      const box = new Box3();
      rig.root.traverse((o) => {
        const g = (o as { geometry?: { type: string; parameters?: { radius?: number } } }).geometry;
        if (g?.type === 'CapsuleGeometry' && g.parameters?.radius === 0.058) box.expandByObject(o);
      });
      rig.dispose();
      return box;
    };
    const rest = arms(REST);
    expect(arms({ ...REST, cheer: 1 }).max.y).toBeGreaterThan(rest.max.y + 0.15);
    expect(arms({ ...REST, droop: 1 }).getSize(new Vector3()).x).toBeLessThan(
      rest.getSize(new Vector3()).x,
    );
  });

  it('keeps the wobbling body finite and near its size', () => {
    const rig = buildRig(BARE_LOOK, '#E0708F');
    rig.update(3.7, { ...REST, wobble: 0.3 });
    rig.root.updateMatrixWorld(true);
    const size = new Box3().setFromObject(rig.root).getSize(new Vector3());
    for (const n of [size.x, size.y, size.z]) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThan(0.5);
      expect(n).toBeLessThan(1.5);
    }
    rig.dispose();
  });
});

describe('animation', () => {
  it('blinks briefly and not all the time', () => {
    let shut = 0;
    for (let t = 0; t < 30; t += 0.02) if (blinkAt(t, 3) > 0.5) shut++;
    expect(shut).toBeGreaterThan(0);
    expect(shut).toBeLessThan(30 * 50 * 0.1);
  });

  it('holds the rest pose with reduced motion, even mid-mood', () => {
    const cue: MoodCue = { mood: 'happy', nonce: 1, at: 0 };
    expect(poseAt(0.3, 2, cue, true)).toEqual(REST);
    expect(poseAt(0.3, 2, null, true)).toEqual(REST);
  });

  it('bounces on happy and droops on droop, then settles back to idle', () => {
    const happy: MoodCue = { mood: 'happy', nonce: 1, at: 10 };
    const idle = poseAt(10.25, 0, null, false);
    expect(poseAt(10.25, 0, happy, false).y).toBeGreaterThan(idle.y + 0.2);
    expect(poseAt(10.25, 0, happy, false).wobble).toBeGreaterThan(idle.wobble);
    expect(poseAt(10.25, 0, happy, false).cheer).toBeGreaterThan(0.9);
    expect(idle.cheer).toBe(0);
    expect(poseAt(10 + HAPPY_SECONDS + 0.1, 0, happy, false)).toEqual(
      poseAt(10 + HAPPY_SECONDS + 0.1, 0, null, false),
    );
    const sad: MoodCue = { mood: 'droop', nonce: 2, at: 0 };
    const mid = poseAt(1, 0, sad, false);
    expect(mid.droop).toBeCloseTo(1, 1);
    expect(mid.scaleY).toBeLessThan(1);
    expect(poseAt(DROOP_SECONDS + 0.1, 0, sad, false).droop).toBe(0);
    expect(moodActive(sad, 1)).toBe(true);
    expect(moodActive(sad, DROOP_SECONDS + 1)).toBe(false);
    expect(moodActive(null, 1)).toBe(false);
  });
});

const setup: GameSetup = {
  players: 2,
  cardsPerPlayer: 1,
  playStyle: 'turns',
  multipliers: false,
  turnOrder: [0, 1],
};
const roll = (player: number, ...values: [number, number, number, number, number]): Move =>
  ({ type: 'roll', player, values }) as Move;

describe('moodsBetween', () => {
  const start = createGame(setup);
  const rolled = (...v: [number, number, number, number, number]) =>
    applyMove(start, roll(0, ...v));

  it('is happy for a score and for a Yatzy roll, and ignores an ordinary roll', () => {
    const r = rolled(1, 1, 2, 3, 4);
    expect(moodsBetween(start, r)).toEqual([]);
    expect(
      moodsBetween(r, applyMove(r, { type: 'score', player: 0, card: 0, box: 'ones' })),
    ).toEqual([{ player: 0, mood: 'happy' }]);
    expect(moodsBetween(start, rolled(6, 6, 6, 6, 6))).toEqual([{ player: 0, mood: 'happy' }]);
  });

  it('droops on a zero', () => {
    const r = rolled(2, 2, 3, 3, 4);
    const zero = applyMove(r, { type: 'score', player: 0, card: 0, box: 'yatzy' });
    expect(moodsBetween(r, zero)).toEqual([{ player: 0, mood: 'droop' }]);
  });

  it('does nothing for the same state', () => {
    expect(moodsBetween(start, start)).toEqual([]);
  });
});

describe('the flat fallback', () => {
  it('draws the body, and a mark for every worn item', () => {
    const bare = renderToString(<FlatAvatar look={BARE_LOOK} tintHex="#A07BD6" />);
    const dressed = renderToString(
      <FlatAvatar
        look={{ hair: 'bob', hat: 'crown', face: 'glasses', held: 'wand', aura: 'sparkles' }}
        tintHex="#A07BD6"
      />,
    );
    expect(bare).toContain('<svg');
    expect(bare).toContain('aria-hidden="true"');
    expect(dressed.length).toBeGreaterThan(bare.length);
  });

  it('washes the tint toward white', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});
