import { useState } from 'react';
import { MSG_USE_POWER, type PowerId, powerById, type WalletMessage } from '@rollhouse/shared';
import { BOX_LABELS } from '../labels';
import { type ScratchedBox, stockOf, type UsablePowers } from './powersView';
import './powers.css';

interface Props {
  wallet: WalletMessage | null;
  usable: UsablePowers;
  /** More than one card: say which card a box is on. */
  cards: number;
  send: (type: string, body?: unknown) => void;
}

const where = (s: ScratchedBox, cards: number): string =>
  cards > 1 ? `${BOX_LABELS[s.box].long} on card ${s.card + 1}` : BOX_LABELS[s.box].long;

/**
 * Your super powers during a game: a small button for each one you own and can
 * use right now, with how many are left. Unscratch asks which zero to reopen
 * and then for a yes. Nothing shows when there is nothing to use.
 */
export function PowersBar({ wallet, usable, cards, send }: Props) {
  const [step, setStep] = useState<'closed' | 'pick' | ScratchedBox>('closed');
  const canUnscratch = usable.unscratch.length > 0;
  if (!usable.extraTurn && !canUnscratch) return null;
  // The list can shrink under you (a new turn, a spent power): fall back to closed.
  const open = canUnscratch ? step : 'closed';

  const button = (id: PowerId, onClick: () => void) => {
    const name = powerById(id)!.name;
    const have = stockOf(wallet, id);
    return (
      <button
        type="button"
        className="power-btn"
        aria-label={`Use ${name}, you have ${have}`}
        onClick={onClick}
      >
        {name}
        <span className="power-count">{have}</span>
      </button>
    );
  };

  return (
    <div className="powers" role="group" aria-label="Super powers" data-testid="powers">
      {open === 'closed' && (
        <>
          {usable.extraTurn &&
            button('extraTurn', () => send(MSG_USE_POWER, { power: 'extraTurn' }))}
          {canUnscratch && button('unscratch', () => setStep('pick'))}
        </>
      )}
      {open === 'pick' && (
        <div className="power-pick" role="group" aria-label="Pick a zero to reopen">
          <p>Which zero do you want to reopen?</p>
          <div className="power-choices">
            {usable.unscratch.map((s) => (
              <button type="button" key={`${s.card}-${s.box}`} onClick={() => setStep(s)}>
                {where(s, cards)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep('closed')}>
            Not now
          </button>
        </div>
      )}
      {open !== 'closed' && open !== 'pick' && (
        <div className="power-pick" role="group" aria-label="Confirm Unscratch">
          <p>
            Reopen <strong>{where(open, cards)}</strong>? This uses one Unscratch.
          </p>
          <div className="power-choices">
            <button
              type="button"
              className="primary"
              onClick={() => {
                send(MSG_USE_POWER, { power: 'unscratch', card: open.card, box: open.box });
                setStep('closed');
              }}
            >
              Yes, reopen it
            </button>
            <button type="button" onClick={() => setStep('pick')}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
