/**
 * What a celebration makes of the game, as pure functions. The client never sees
 * a separate "event" message: the table already replays the move log into a
 * GameState after every move, so an event is whatever changed between two
 * consecutive states (a roll, a score, a zero, a Yatzy). Nothing here talks to
 * the server, and nothing fires from a snapshot: a reconnect replays the same
 * log into an identical state, which differs from the last one by nothing.
 */
import { type Box, BOXES, type Die, type GameState, isYatzy, YATZY } from '@rollhouse/rules';

/** Something a player just did, read off the change between two game states. */
export type GameEvent =
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
export function eventsBetween(prev: GameState, next: GameState): GameEvent[] {
  if (prev === next || prev.players.length !== next.players.length) return [];
  const events: GameEvent[] = [];
  const scores: GameEvent[] = [];
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
export function isYatzyEvent(event: GameEvent): boolean {
  if (event.kind === 'roll') return isYatzy(event.dice);
  if (event.kind === 'score')
    return event.yatzyBonus || (event.box === 'yatzy' && event.value === YATZY);
  return false;
}

/** What the celebration remembers between events, per player: did their last roll already party? */
export type CelebrationMemo = { readonly player: number; readonly rolled: boolean } | null;

/**
 * Decides whether an event fires the celebration, once. A Yatzy roll fires it.
 * The Yatzy score that follows from that same roll does not (it would be a
 * second parade for one Yatzy); a Yatzy score whose roll was never seen live
 * does. Anything else, or another player's move, resets the memory.
 */
export function celebrationStep(
  event: GameEvent,
  memo: CelebrationMemo,
): { fire: boolean; memo: CelebrationMemo } {
  const yatzy = isYatzyEvent(event);
  if (event.kind === 'roll') {
    return { fire: yatzy, memo: yatzy ? { player: event.player, rolled: true } : null };
  }
  const followsRoll = memo?.player === event.player && memo.rolled;
  return { fire: yatzy && !followsRoll, memo: event.kind === 'score' ? null : memo };
}
