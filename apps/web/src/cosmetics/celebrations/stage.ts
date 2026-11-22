/**
 * The pure part of the celebration stage: given a game event, should a parade
 * play? useParadeStage runs this on every new game state.
 */
import type { Equipped } from '@rollhouse/shared';
import { type CelebrationMemo, celebrationStep, type GameEvent } from './events';

/** A parade to play: whose Yatzy it is, and a nonce so a second parade restarts the first. */
export interface ParadeCue {
  player: number;
  id: number;
}

export interface StageState {
  parade: ParadeCue | null;
  memo: CelebrationMemo;
  nonce: number;
}

export const START: StageState = { parade: null, memo: null, nonce: 0 };

/** What each seat has on, with the dev override laid over everyone's. */
export type EquippedOf = (player: number) => Equipped;

/**
 * Folds one event into the stage: the parade fires when the player who got the
 * Yatzy has the ghost parade on. `parade` is set only by the step that fires
 * it, so it can never fire twice.
 */
export function stageStep(state: StageState, event: GameEvent, equippedOf: EquippedOf): StageState {
  const nonce = state.nonce + 1;
  const step = celebrationStep(event, state.memo);
  const parade: ParadeCue | null =
    step.fire && equippedOf(event.player).celebration === 'ghostParade'
      ? { player: event.player, id: nonce }
      : null;
  return { parade, memo: step.memo, nonce };
}
