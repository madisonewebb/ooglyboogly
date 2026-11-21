/**
 * The pure part of the pet stage: given a game, a table and what changed,
 * what should the screen show? usePetStage runs this on every new game state.
 */
import type { GameState } from '@rollhouse/rules';
import type { Equipped } from '@rollhouse/shared';
import {
  type CelebrationMemo,
  celebrationStep,
  isPetId,
  type PetEvent,
  type PetId,
  type PetPose,
  type ReactionPose,
  petMood,
  petOwner,
  reactsTo,
} from './mood';

/** One pet reaction in progress. `nonce` makes a repeat of the same pose play again. */
export interface Reaction {
  player: number;
  pose: ReactionPose;
  nonce: number;
}

/** A parade to play: whose Yatzy it is, and a nonce so a second parade restarts the first. */
export interface ParadeCue {
  player: number;
  id: number;
}

export interface StageState {
  reaction: Reaction | null;
  parade: ParadeCue | null;
  memo: CelebrationMemo;
  nonce: number;
}

export const START: StageState = { reaction: null, parade: null, memo: null, nonce: 0 };

/** What each seat has on, with the dev override laid over everyone's. */
export type EquippedOf = (player: number) => Equipped;

/**
 * Folds one event into the stage: the parade fires when the player who got the
 * Yatzy has the ghost parade on, and the pet reacts when it is the pet on show
 * (in Take turns always; in Everyone at once only the tray player's own).
 * `parade` is set only by the step that fires it, so it can never fire twice.
 */
export function stageStep(
  state: StageState,
  event: PetEvent,
  ctx: { playStyle: GameState['setup']['playStyle']; trayPlayer: number; equippedOf: EquippedOf },
): StageState {
  const nonce = state.nonce + 1;
  const step = celebrationStep(event, state.memo);
  let { reaction } = state;
  let parade: ParadeCue | null = null;
  if (step.fire && ctx.equippedOf(event.player).celebration === 'ghostParade') {
    parade = { player: event.player, id: nonce };
  }
  if (reactsTo(ctx.playStyle, ctx.trayPlayer, event)) {
    const mood = petMood(event);
    if (mood && isPetId(ctx.equippedOf(event.player).pet)) {
      reaction = { player: event.player, pose: mood, nonce };
    }
  }
  return { reaction, parade, memo: step.memo, nonce };
}

/** The pet on screen and its pose, given who is in the tray and any reaction in progress. */
export function petOnShow(
  playStyle: GameState['setup']['playStyle'],
  trayPlayer: number,
  reaction: Reaction | null,
  equippedOf: EquippedOf,
): { owner: number; pet: PetId | undefined; pose: PetPose; nonce: number } {
  const owner = petOwner(playStyle, trayPlayer, reaction?.player ?? null);
  const pet = equippedOf(owner).pet;
  return {
    owner,
    pet: isPetId(pet) ? pet : undefined,
    pose: reaction && reaction.player === owner ? reaction.pose : 'idle',
    nonce: reaction?.nonce ?? 0,
  };
}
