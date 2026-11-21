/**
 * What a pet makes of the game, as pure functions. The client never sees a
 * separate "event" message: the table already replays the move log into a
 * GameState after every move, so a reaction is whatever changed between two
 * consecutive states (a roll, a score, a zero, a Yatzy). Nothing here talks to
 * the server, and nothing fires from a snapshot: a reconnect replays the same
 * log into an identical state, which differs from the last one by nothing.
 */
import {
  type Box,
  BOXES,
  type Die,
  type GameState,
  isYatzy,
  ROLLS_PER_TURN,
  scoreBox,
  YATZY,
} from '@rollhouse/rules';

export const PET_IDS = ['toad', 'blackCat', 'bat', 'ghostCheerleader'] as const;
export type PetId = (typeof PET_IDS)[number];
export const isPetId = (v: unknown): v is PetId => (PET_IDS as readonly unknown[]).includes(v);

export const POSES = ['idle', 'happy', 'sad', 'cheer'] as const;
export type PetPose = (typeof POSES)[number];
/** The poses a reaction puts a pet in; idle is where it settles back to. */
export type ReactionPose = Exclude<PetPose, 'idle'>;

/** The poses each pet has art for. Only the legendary one has a Yatzy cheer. */
export const PET_POSES: Record<PetId, readonly PetPose[]> = {
  toad: ['idle', 'happy', 'sad'],
  blackCat: ['idle', 'happy', 'sad'],
  bat: ['idle', 'happy', 'sad'],
  ghostCheerleader: ['idle', 'happy', 'sad', 'cheer'],
};

/** The pose a pet really shows for a wanted one: a pet without a cheer is just happy. */
export function poseFor(pet: PetId, pose: PetPose): PetPose {
  return PET_POSES[pet].includes(pose) ? pose : 'happy';
}

/** Something a player just did, read off the change between two game states. */
export type PetEvent =
  | { kind: 'roll'; player: number; dice: readonly Die[]; rollNumber: number }
  | { kind: 'score'; player: number; box: Box; value: number; yatzyBonus: boolean }
  | { kind: 'undo'; player: number };

/**
 * Live play changes the state by one move at a time (React may batch a roll
 * and a score together, never more). A bigger jump is a catch-up after a
 * reconnect, not play: nothing reacts.
 */

/**
 * The events that turn `prev` into `next`: a roll (the roll counter went up), a
 * score (a box got filled) or an undo (one got emptied). Rolls come before
 * scores. Returns none when the states are the same game position, or when too
 * much changed at once to be live play.
 */
export function eventsBetween(prev: GameState, next: GameState): PetEvent[] {
  if (prev === next || prev.players.length !== next.players.length) return [];
  const events: PetEvent[] = [];
  const scores: PetEvent[] = [];
  next.players.forEach((now, player) => {
    const before = prev.players[player]!;
    const dice = now.turn.dice;
    if (now.turn.rolls > before.turn.rolls && dice !== null) {
      events.push({ kind: 'roll', player, dice, rollNumber: now.turn.rolls });
    }
    now.cards.forEach((card, c) => {
      const old = before.cards[c];
      if (!old) return;
      for (const box of BOXES) {
        const had = old.boxes[box];
        const has = card.boxes[box];
        if (had === undefined && has !== undefined) {
          scores.push({
            kind: 'score',
            player,
            box,
            value: has,
            yatzyBonus: card.yatzyBonuses > old.yatzyBonuses,
          });
        } else if (had !== undefined && has === undefined) {
          scores.push({ kind: 'undo', player });
        }
      }
    });
  });
  // An undo hands the turn back, which also raises the roll counter: that is not a roll.
  const undone = new Set(scores.filter((e) => e.kind === 'undo').map((e) => e.player));
  const rolls = events.filter((e) => !undone.has(e.player));
  return rolls.length > 1 || scores.length > 1 ? [] : [...rolls, ...scores];
}

/** True when this event is a Yatzy: five of a kind rolled, or a Yatzy written in. */
export function isYatzyEvent(event: PetEvent): boolean {
  if (event.kind === 'roll') return isYatzy(event.dice);
  if (event.kind === 'score')
    return event.yatzyBonus || (event.box === 'yatzy' && event.value === YATZY);
  return false;
}

/** The boxes a final roll can still be proud of. */
const SHOWY: readonly Box[] = ['fourKind', 'fullHouse', 'smallStraight', 'largeStraight'];
/** If none of these score, the roll has nothing in it. */
const ANYTHING: readonly Box[] = ['threeKind', ...SHOWY, 'yatzy'];

/**
 * How a pet feels about an event, or null for no reaction at all.
 * - a Yatzy (rolled or written): cheer
 * - a roll with four of a kind, a full house or a straight: happy
 * - the last roll of a turn with nothing in it (no three of a kind, straight or full house): sad
 * - a score of 0 (a bust): sad; any other score: happy
 * Undo, and an ordinary roll, leave the pet as it is.
 */
export function petMood(event: PetEvent): ReactionPose | null {
  if (isYatzyEvent(event)) return 'cheer';
  if (event.kind === 'undo') return null;
  if (event.kind === 'score') return event.value === 0 ? 'sad' : 'happy';
  if (SHOWY.some((box) => scoreBox(box, event.dice) > 0)) return 'happy';
  if (
    event.rollNumber >= ROLLS_PER_TURN &&
    !ANYTHING.some((box) => scoreBox(box, event.dice) > 0)
  ) {
    return 'sad';
  }
  return null;
}

/** How long a reaction lasts before the pet settles back to idle, in ms. */
export const REACTION_MS: Record<ReactionPose, number> = {
  happy: 1800,
  sad: 2200,
  cheer: 3400,
};

/** What the celebration remembers between events, per player: did their last roll already party? */
export type CelebrationMemo = { readonly player: number; readonly rolled: boolean } | null;

/**
 * Decides whether an event fires the celebration, once. A Yatzy roll fires it.
 * The Yatzy score that follows from that same roll does not (it would be a
 * second parade for one Yatzy); a Yatzy score whose roll was never seen live
 * does. Anything else, or another player's move, resets the memory.
 */
export function celebrationStep(
  event: PetEvent,
  memo: CelebrationMemo,
): { fire: boolean; memo: CelebrationMemo } {
  const yatzy = isYatzyEvent(event);
  if (event.kind === 'roll') {
    return { fire: yatzy, memo: yatzy ? { player: event.player, rolled: true } : null };
  }
  const followsRoll = memo?.player === event.player && memo.rolled;
  return { fire: yatzy && !followsRoll, memo: event.kind === 'score' ? null : memo };
}

/**
 * Whose pet is on screen. In Take turns the pet follows whoever just did
 * something, for as long as its reaction lasts (the turn has already moved on
 * by the time a score lands, and the roller's pet should get its moment), then
 * the pet of whoever is up. In Everyone at once it is the pet of the player
 * whose tray you are looking at, and only their moves make it react.
 */
export function petOwner(
  playStyle: GameState['setup']['playStyle'],
  trayPlayer: number,
  reactingPlayer: number | null,
): number {
  return playStyle === 'turns' && reactingPlayer !== null ? reactingPlayer : trayPlayer;
}

/** Whether an event moves the pet on screen. */
export function reactsTo(
  playStyle: GameState['setup']['playStyle'],
  trayPlayer: number,
  event: PetEvent,
): boolean {
  return playStyle === 'turns' || event.player === trayPlayer;
}
