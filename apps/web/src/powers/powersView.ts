import { BOXES, type Box, type GameState, tryMove } from '@rollhouse/rules';
import type { Power, PowerId, WalletMessage } from '@rollhouse/shared';

/** How many of a power the player has. */
export const stockOf = (wallet: WalletMessage | null, id: PowerId): number =>
  wallet?.powers[id] ?? 0;

/** One clear state for a power's shop card. A power stays buyable however many you own. */
export type PowerCardState =
  | { kind: 'afford' }
  | { kind: 'short'; missing: number }
  /** This player cannot spend here (a guest outside dev). */
  | { kind: 'closed' };

export function powerCardState(power: Power, wallet: WalletMessage | null): PowerCardState {
  if (!wallet?.canBuy) return { kind: 'closed' };
  return wallet.balance >= power.price
    ? { kind: 'afford' }
    : { kind: 'short', missing: power.price - wallet.balance };
}

/** "You have 3", or "You have none". */
export const haveLabel = (n: number): string => (n === 0 ? 'You have none' : `You have ${n}`);

export interface ScratchedBox {
  card: number;
  box: Box;
}

export interface UsablePowers {
  /** True when the player owns one and using it is legal right now. */
  extraTurn: boolean;
  /** Scratched boxes on the player's own cards, when they own an Unscratch. Empty means not usable. */
  unscratch: ScratchedBox[];
}

/**
 * Which powers the viewer can use this moment: owned, and legal by the rules
 * engine itself (so this can never disagree with the server).
 */
export function usablePowers(
  game: GameState,
  seat: number | null,
  wallet: WalletMessage | null,
): UsablePowers {
  const none: UsablePowers = { extraTurn: false, unscratch: [] };
  if (seat === null || !wallet?.canBuy || game.finished) return none;
  const extraTurn =
    stockOf(wallet, 'extraTurn') > 0 && tryMove(game, { type: 'extraTurn', player: seat }).ok;
  const unscratch =
    stockOf(wallet, 'unscratch') > 0
      ? game.players[seat]!.cards.flatMap((c, card) =>
          BOXES.filter((box) => c.boxes[box] === 0).map((box) => ({ card, box })),
        )
      : [];
  return { extraTurn, unscratch };
}
