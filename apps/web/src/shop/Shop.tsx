import { useState } from 'react';
import {
  MSG_BUY,
  MSG_EQUIP,
  MSG_GOAL,
  type ShopEntry,
  type WalletMessage,
} from '@rollhouse/shared';
import { BrandBar } from '../Brand';
import { CauldronCoinIcon, CheckIcon } from '../icons';
import { ItemPreview } from './ItemPreview';
import { GoalBar } from './WalletPanel';
import {
  type CardState,
  cardState,
  coinWord,
  RARITY_LABEL,
  shopSections,
  stateLabel,
} from './shopView';
import './shop.css';

type Send = (type: string, body?: unknown) => void;

interface CardProps {
  entry: ShopEntry;
  wallet: WalletMessage | null;
  send: Send;
  confirming: boolean;
  setConfirming: (id: string | null) => void;
}

/** One thing for sale: what it is, what it costs, where you stand, and what you can do. */
export function ShopCard({ entry, wallet, send, confirming, setConfirming }: CardProps) {
  const state: CardState = cardState(entry, wallet);
  const isGoal = wallet?.goal === entry.id;
  const canPin = (state.kind === 'afford' || state.kind === 'short') && wallet?.canBuy;
  return (
    <li
      className="shop-card"
      data-testid={`card-${entry.id}`}
      data-state={state.kind}
      data-rarity={entry.rarity}
    >
      <ItemPreview entry={entry} />
      <div className="card-head">
        <h4>{entry.name}</h4>
        <span className="rarity">{RARITY_LABEL[entry.rarity]}</span>
      </div>
      <p className="card-blurb">{entry.blurb}</p>
      <p className="price">
        <CauldronCoinIcon />
        <span className="amount">{entry.price}</span>
        <span className="sr-only">coins</span>
      </p>
      <p className="state" data-testid={`state-${entry.id}`}>
        {state.kind === 'owned' && <CheckIcon />}
        {stateLabel(state)}
        {isGoal && ', your goal'}
      </p>

      <div className="card-actions">
        {state.kind === 'soon' && (
          <button type="button" disabled>
            Coming soon
          </button>
        )}
        {state.kind === 'closed' && (
          <button type="button" disabled>
            Not available
          </button>
        )}
        {state.kind === 'short' && (
          <button type="button" disabled aria-label={`Buy ${entry.name}, ${stateLabel(state)}`}>
            Buy
          </button>
        )}
        {state.kind === 'afford' &&
          (confirming ? (
            <div className="confirm" role="group" aria-label={`Confirm buying ${entry.name}`}>
              <p>
                Spend <strong>{coinWord(entry.price)}</strong> on {entry.name}?
              </p>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setConfirming(null);
                  send(MSG_BUY, { item: entry.id });
                }}
              >
                Yes, buy it
              </button>
              <button type="button" onClick={() => setConfirming(null)}>
                Not now
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="primary"
              aria-label={`Buy ${entry.name} for ${coinWord(entry.price)}`}
              onClick={() => setConfirming(entry.id)}
            >
              Buy
            </button>
          ))}
        {state.kind === 'owned' && entry.slot !== null && (
          <button
            type="button"
            aria-pressed={state.worn}
            onClick={() =>
              send(MSG_EQUIP, { slot: entry.slot, item: state.worn ? null : entry.id })
            }
          >
            {state.worn ? 'Take off' : 'Wear it'}
          </button>
        )}
        {canPin && !confirming && (
          <button
            type="button"
            className="pin"
            aria-pressed={isGoal}
            onClick={() => send(MSG_GOAL, { item: isGoal ? null : entry.id })}
          >
            {isGoal ? 'Unpin goal' : 'Pin as goal'}
          </button>
        )}
      </div>
    </li>
  );
}

interface Props {
  wallet: WalletMessage | null;
  send: Send;
  onClose: () => void;
}

/** The shop, opened from the lobby. */
export function Shop({ wallet, send, onClose }: Props) {
  // The card waiting on "Yes, buy it". Only one at a time.
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <>
      <BrandBar />
      <main className="screen shop">
        <header className="shop-head">
          <button type="button" onClick={onClose}>
            Back to the table
          </button>
          <h2>The Shop</h2>
          <p className="balance" data-testid="shop-balance">
            <CauldronCoinIcon />
            <span className="amount">{wallet?.balance ?? 0}</span>
            <span className="quiet">{wallet?.balance === 1 ? 'coin' : 'coins'}</span>
          </p>
        </header>
        {wallet && !wallet.canBuy && (
          <p className="panel">Guests cannot spend coins. Sign in with Discord to shop.</p>
        )}
        {wallet && <GoalBar wallet={wallet} />}
        {shopSections().map((section) => (
          <section
            key={section.key}
            className="panel shop-section"
            aria-labelledby={`h-${section.key}`}
          >
            <h3 id={`h-${section.key}`}>{section.title}</h3>
            <p className="quiet">{section.blurb}</p>
            <ul className="shop-grid">
              {section.entries.map((entry) => (
                <ShopCard
                  key={entry.id}
                  entry={entry}
                  wallet={wallet}
                  send={send}
                  confirming={confirming === entry.id}
                  setConfirming={setConfirming}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
