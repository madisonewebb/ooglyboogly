import type { WalletMessage } from '@rollhouse/shared';
import { CauldronCoinIcon } from '../icons';
import { coinWord, goalProgress } from './shopView';
import './shop.css';

/** The pinned goal: its name and coins toward its price. Words and numbers beside the bar. */
export function GoalBar({ wallet }: { wallet: WalletMessage }) {
  const goal = goalProgress(wallet);
  if (!goal) return null;
  const { entry } = goal;
  return (
    <div className="goal" data-testid="goal">
      <p className="goal-title">
        Saving for <strong>{entry.name}</strong>
      </p>
      <div
        className="bar"
        role="progressbar"
        aria-label={`Coins toward ${entry.name}`}
        aria-valuemin={0}
        aria-valuemax={entry.price}
        aria-valuenow={Math.min(goal.balance, entry.price)}
      >
        <span className="bar-fill" style={{ width: `${goal.percent}%` }} />
      </div>
      <p className="quiet goal-note">
        {goal.ready
          ? `Ready to buy: ${entry.name} costs ${coinWord(entry.price)}.`
          : `${goal.balance} of ${coinWord(entry.price)}`}
      </p>
    </div>
  );
}

/** The lobby's coins: the balance, the goal bar and the way into the shop. */
export function WalletPanel({
  wallet,
  onShop,
}: {
  wallet: WalletMessage | null;
  onShop: () => void;
}) {
  // Nothing to show where this player cannot spend (guests outside dev).
  if (!wallet?.canBuy) return null;
  return (
    <section className="panel wallet-panel" aria-labelledby="wallet-heading">
      <h2 id="wallet-heading">Your coins</h2>
      <p className="balance" data-testid="lobby-balance">
        <CauldronCoinIcon />
        <span className="amount">{wallet.balance}</span>
        <span className="quiet">{wallet.balance === 1 ? 'coin' : 'coins'}</span>
      </p>
      <GoalBar wallet={wallet} />
      <button type="button" className="shop-open" onClick={onShop}>
        Open the shop
      </button>
    </section>
  );
}
