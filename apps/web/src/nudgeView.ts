import { activePlayers, BOXES, type GameState } from '@rollhouse/rules';
import type { Lobby } from '@rollhouse/shared';

/** Seats this viewer could nudge: whoever is up, other than themselves. Spectators get none. */
export function nudgeTargets(game: GameState, seat: number | null): number[] {
  if (seat === null) return [];
  return activePlayers(game).filter((p) => p !== seat);
}

/**
 * Changes whenever the people being waited on make progress (roll, hold,
 * score), so the idle clock restarts. In Take turns it also changes when the
 * turn passes to someone new.
 */
export function idleKey(game: GameState, targets: readonly number[]): string {
  const progress = (p: number) => {
    const ps = game.players[p]!;
    const filled = ps.cards.reduce(
      (n, c) => n + BOXES.filter((b) => c.boxes[b] !== undefined).length,
      0,
    );
    return `${p}:${filled}:${JSON.stringify(ps.turn)}`;
  };
  const turn = game.setup.playStyle === 'turns' ? `t${game.pointer}` : 'tg';
  return `${turn}|${targets.map(progress).join('|')}`;
}

/** The names, as "Mom", "Mom and Nana", or "Mom, Nana and Mema". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** What everyone sees when a nudge goes by; the nudged player gets their own wording. */
export function nudgeLine(
  lobby: Lobby,
  fromUserId: string,
  toUserId: string,
  me: string | null,
): string {
  const nameOf = (id: string) =>
    [...lobby.seats.map((s) => s.user), ...lobby.spectators].find((u) => u.id === id)?.name ??
    'Someone';
  if (toUserId === me) return `${nameOf(fromUserId)} nudged you. Take your time, no rush.`;
  return `${nameOf(fromUserId)} nudged ${nameOf(toUserId)}`;
}
