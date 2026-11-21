import { describe, expect, it } from 'vitest';
import type { Die } from '@rollhouse/rules';
import type { Equipped } from '@rollhouse/shared';
import type { PetEvent } from './mood';
import { type EquippedOf, petOnShow, START, stageStep } from './stage';

const worn: Record<number, Equipped> = {
  0: { pet: 'toad', celebration: 'ghostParade' },
  1: { pet: 'ghostCheerleader' },
  2: {},
};
const equippedOf: EquippedOf = (p) => worn[p] ?? {};
const turns = { playStyle: 'turns', trayPlayer: 1, equippedOf } as const;
const together = { playStyle: 'together', trayPlayer: 1, equippedOf } as const;

const yatzyRoll = (player: number): PetEvent => ({
  kind: 'roll',
  player,
  dice: [6, 6, 6, 6, 6] as Die[],
  rollNumber: 1,
});
const zero = (player: number): PetEvent => ({
  kind: 'score',
  player,
  box: 'fullHouse',
  value: 0,
  yatzyBonus: false,
});

describe('stageStep', () => {
  it('fires the parade of the player who rolled a Yatzy, once, and cheers their pet', () => {
    const s = stageStep(START, yatzyRoll(0), turns);
    expect(s.parade).toEqual({ player: 0, id: 1 });
    expect(s.reaction).toEqual({ player: 0, pose: 'cheer', nonce: 1 });
    // The score of that same Yatzy does not fire a second parade.
    const after = stageStep(
      s,
      { kind: 'score', player: 0, box: 'yatzy', value: 50, yatzyBonus: false },
      turns,
    );
    expect(after.parade).toBeNull();
  });

  it('needs the celebration to be equipped by the player with the Yatzy', () => {
    expect(stageStep(START, yatzyRoll(1), turns).parade).toBeNull();
    expect(stageStep(START, yatzyRoll(2), turns).parade).toBeNull();
  });

  it('plays a parade for anyone at the table, not only the tray player', () => {
    expect(stageStep(START, yatzyRoll(0), together).parade).toEqual({ player: 0, id: 1 });
  });

  it('shows a reaction for the player who acted in Take turns, even when the tray has moved on', () => {
    expect(stageStep(START, zero(0), turns).reaction).toMatchObject({ player: 0, pose: 'sad' });
  });

  it('reacts only to the tray player in Everyone at once', () => {
    expect(stageStep(START, zero(0), together).reaction).toBeNull();
    expect(stageStep(START, zero(1), together).reaction).toMatchObject({ player: 1, pose: 'sad' });
  });

  it('does not react for a player without a pet', () => {
    expect(stageStep(START, zero(2), turns).reaction).toBeNull();
  });

  it('keeps the last reaction through an event that says nothing', () => {
    const s = stageStep(START, zero(1), turns);
    const quiet = stageStep(s, { kind: 'undo', player: 1 }, turns);
    expect(quiet.reaction).toBe(s.reaction);
  });
});

describe('petOnShow', () => {
  it('shows the tray player pet at rest, idle', () => {
    expect(petOnShow('turns', 1, null, equippedOf)).toEqual({
      owner: 1,
      pet: 'ghostCheerleader',
      pose: 'idle',
      nonce: 0,
    });
  });

  it('follows the acting player while they react in Take turns, then hands over', () => {
    const r = { player: 0, pose: 'happy', nonce: 4 } as const;
    expect(petOnShow('turns', 1, r, equippedOf)).toEqual({
      owner: 0,
      pet: 'toad',
      pose: 'happy',
      nonce: 4,
    });
    expect(petOnShow('turns', 1, null, equippedOf).owner).toBe(1);
  });

  it('stays on the tray player in Everyone at once', () => {
    const r = { player: 0, pose: 'happy', nonce: 4 } as const;
    expect(petOnShow('together', 1, r, equippedOf)).toMatchObject({ owner: 1, pose: 'idle' });
  });

  it('shows nothing when nothing is equipped, or the id is unknown', () => {
    expect(petOnShow('turns', 2, null, equippedOf).pet).toBeUndefined();
    expect(petOnShow('turns', 1, null, () => ({ pet: 'dragon' })).pet).toBeUndefined();
  });
});
