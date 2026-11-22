import { type ReactNode, useState } from 'react';
import {
  MSG_BUY,
  MSG_BUY_POWER,
  MSG_EQUIP,
  MSG_GOAL,
  type Power,
  POWERS,
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
import { haveLabel, powerCardState, stockOf } from '../powers/powersView';
import './shop.css';
import '../powers/powers.css';

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

/** Line glyphs for the two powers: an hourglass, and a pen crossing out a zero. */
const POWER_GLYPHS: Record<Power['id'], ReactNode> = {
  extraTurn: (
    <>
      <path d="M18 10h28M18 54h28" />
      <path d="M20 10c0 14 12 14 12 22s-12 8-12 22M44 10c0 14-12 14-12 22s12 8 12 22" />
    </>
  ),
  unscratch: (
    <>
      <ellipse cx="28" cy="32" rx="12" ry="17" />
      <path d="M40 50l12-12M46 56l8-2-2-8" />
    </>
  ),
};

interface PowerCardProps {
  power: Power;
  wallet: WalletMessage | null;
  send: Send;
  confirming: boolean;
  setConfirming: (id: string | null) => void;
}

/** A super power for sale. You can always buy more: the card says how many you hold. */
export function PowerCard({ power, wallet, send, confirming, setConfirming }: PowerCardProps) {
  const state = powerCardState(power, wallet);
  const have = stockOf(wallet, power.id);
  return (
    <li
      className="shop-card"
      data-testid={`card-${power.id}`}
      data-state={state.kind}
      data-kind="power"
    >
      <div className="preview preview-glyph" aria-hidden="true">
        <svg
          viewBox="0 0 64 64"
          width="64"
          height="64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {POWER_GLYPHS[power.id]}
        </svg>
      </div>
      <div className="card-head">
        <h4>{power.name}</h4>
        <span className="rarity">One use</span>
      </div>
      <p className="card-blurb">{power.blurb}</p>
      <p className="price">
        <CauldronCoinIcon />
        <span className="amount">{power.price}</span>
        <span className="sr-only">coins</span>
      </p>
      <p className="have" data-testid={`have-${power.id}`}>
        {haveLabel(have)}
      </p>
      <p className="state" data-testid={`state-${power.id}`}>
        {state.kind === 'afford' && 'You can afford this'}
        {state.kind === 'short' && `${coinWord(state.missing)} short`}
        {state.kind === 'closed' && 'Not for sale to guests'}
      </p>
      <div className="card-actions">
        {state.kind === 'closed' && (
          <button type="button" disabled>
            Not available
          </button>
        )}
        {state.kind === 'short' && (
          <button
            type="button"
            disabled
            aria-label={`Buy ${power.name}, ${coinWord(state.missing)} short`}
          >
            Buy
          </button>
        )}
        {state.kind === 'afford' &&
          (confirming ? (
            <div className="confirm" role="group" aria-label={`Confirm buying ${power.name}`}>
              <p>
                Spend <strong>{coinWord(power.price)}</strong> on one {power.name}?
              </p>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setConfirming(null);
                  send(MSG_BUY_POWER, { power: power.id });
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
              aria-label={`Buy ${power.name} for ${coinWord(power.price)}`}
              onClick={() => setConfirming(power.id)}
            >
              Buy
            </button>
          ))}
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
        <section className="panel shop-section" aria-labelledby="h-powers">
          <h3 id="h-powers">Super powers</h3>
          <p className="quiet">One use each. Buy as many as you like and use them in a game.</p>
          <ul className="shop-grid">
            {POWERS.map((power) => (
              <PowerCard
                key={power.id}
                power={power}
                wallet={wallet}
                send={send}
                confirming={confirming === power.id}
                setConfirming={setConfirming}
              />
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
