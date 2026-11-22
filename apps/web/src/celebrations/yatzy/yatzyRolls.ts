/**
 * When does a Yatzy roll happen, and whose is it? Pure, and driven only by the
 * replayed move log: the table replays the log into a GameState after every
 * move, so a Yatzy roll is whatever differs between two consecutive states. A
 * reconnect, a replay or a snapshot hands over the same position (or a big
 * catch-up), and so never counts as a roll.
 */
import { BOXES, type GameState, isYatzy } from '@rollhouse/rules';

/** Whether this player's pad lost a score between the two states (an undo). */
function undid(prev: GameState['players'][number], next: GameState['players'][number]): boolean {
  return next.cards.some((card, c) => {
    const old = prev.cards[c];
    return !!old && BOXES.some((b) => old.boxes[b] !== undefined && card.boxes[b] === undefined);
  });
}

/**
 * The players who rolled a Yatzy (five of a kind) going from `prev` to `next`,
 * in seat order; empty when nobody did. A player counts when their roll counter
 * went up by exactly one (live play), their dice are five of a kind, and it was
 * not an undo (which also hands the turn back). Re-rolling dice that already
 * showed a Yatzy (everything held) is the same Yatzy, not a new one. A jump of
 * more than one roll is a catch-up, never live play.
 */
export function yatzyRollsBetween(prev: GameState, next: GameState): number[] {
  if (prev === next || prev.players.length !== next.players.length) return [];
  const rollers: number[] = [];
  next.players.forEach((now, player) => {
    const before = prev.players[player]!;
    const dice = now.turn.dice;
    if (dice === null || now.turn.rolls !== before.turn.rolls + 1) return;
    if (!isYatzy(dice) || undid(before, now)) return;
    if (before.turn.dice !== null && before.turn.rolls > 0 && isYatzy(before.turn.dice)) return;
    rollers.push(player);
  });
  return rollers;
}
