import { describe, expect, it } from 'vitest';
import type { Die } from '@rollhouse/rules';
import type { Equipped } from '@rollhouse/shared';
import type { GameEvent } from './events';
import { type EquippedOf, START, stageStep } from './stage';

const worn: Record<number, Equipped> = { 0: { celebration: 'ghostParade' }, 1: {} };
const equippedOf: EquippedOf = (p) => worn[p] ?? {};

const yatzyRoll = (player: number): GameEvent => ({
  kind: 'roll',
  player,
  dice: [6, 6, 6, 6, 6] as Die[],
  rollNumber: 1,
});

describe('stageStep', () => {
  it('fires the parade of the player who rolled a Yatzy, once', () => {
    const s = stageStep(START, yatzyRoll(0), equippedOf);
    expect(s.parade).toEqual({ player: 0, id: 1 });
    // The score of that same Yatzy does not fire a second parade.
    const after = stageStep(
      s,
      { kind: 'score', player: 0, box: 'yatzy', value: 50, yatzyBonus: false },
      equippedOf,
    );
    expect(after.parade).toBeNull();
  });

  it('needs the celebration to be equipped by the player with the Yatzy', () => {
    expect(stageStep(START, yatzyRoll(1), equippedOf).parade).toBeNull();
    expect(stageStep(START, yatzyRoll(2), equippedOf).parade).toBeNull();
  });

  it('does nothing for an ordinary move', () => {
    const s = stageStep(START, { kind: 'undo', player: 0 }, equippedOf);
    expect(s.parade).toBeNull();
  });
});
