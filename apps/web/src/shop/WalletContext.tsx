import { createContext, useContext } from 'react';
import type { WalletMessage } from '@rollhouse/shared';

/**
 * The signed-in player's own coins, items and goal, as the server last sent
 * them. Null until the table has answered. The lobby, the shop and the sticker
 * picker all read it from here, so none of them needs it passed down.
 */
export const WalletContext = createContext<WalletMessage | null>(null);

export const useWallet = (): WalletMessage | null => useContext(WalletContext);
