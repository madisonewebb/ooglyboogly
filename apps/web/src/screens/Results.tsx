import { animate, motion, type MotionStyle, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { type GameState, playerTotal, type PlayerTotal, UPPER_BONUS } from '@rollhouse/rules';
import type { Lobby, PayoutMessage } from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import { Sparkles } from '../Sparkles';
import { tintOf, tintVars } from '../tint';
import { CauldronCoinIcon, CrownIcon } from '../icons';
import { balanceText, type CoinLine, coinLineFor } from '../payoutView';
import { playCelebrate } from '../sound';
import { SPRING } from '../theme/motion';
import { usePrefs } from '../theme/prefs';
import '../payout.css';

interface Props {
  game: GameState;
  lobby: Lobby;
  cdnBase: string;
  /** What the game paid; null until it arrives, and when nobody was paid. */
  payout: PayoutMessage | null;
}

/** "Upper bonus +35", saying which cards earned it when there's more than one; null if none did. */
function upperBonusNote(totals: PlayerTotal, multi: boolean): string | null {
  const cards = totals.cards.flatMap((c, i) => (c.upperBonus > 0 ? [i + 1] : []));
  if (cards.length === 0) return null;
  const note = `Upper bonus +${UPPER_BONUS}`;
  if (!multi) return note;
  if (cards.length === 1) return `${note} on card ${cards[0]}`;
  return `${note} on cards ${cards.slice(0, -1).join(', ')} and ${cards.at(-1)}`;
}

/** A number that counts up to its value, after a delay. */
function CountUp({ value, delay }: { value: number; delay: number }) {
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? value : 0);
  useEffect(() => {
    if (still) return setShown(value);
    const run = animate(0, value, {
      duration: 1.1,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => run.stop();
  }, [value, delay, still]);
  return <>{shown}</>;
}

/** What one player earned. The payout can land just after the final move, so it fades in. */
function CoinNote({ line, still }: { line: CoinLine | null; still: boolean | null }) {
  if (!line) return null;
  return (
    <motion.p
      className="coin-note"
      data-testid="coin-line"
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <span className="coin-icon">
        <CauldronCoinIcon />
      </span>
      <strong className="coin-amount">{line.label}</strong>
      <span className="coin-why">{line.breakdown}</span>
    </motion.p>
  );
}

export function Results({ game, lobby, cdnBase, payout }: Props) {
  const { theme } = usePrefs();
  const still = useReducedMotion();
  const balance = balanceText(payout);
  const multi = game.setup.cardsPerPlayer > 1;
  const rows = lobby.seats
    .map((s, i) => {
      const totals = playerTotal(game, i);
      return { seat: s, totals, bonus: upperBonusNote(totals, multi) };
    })
    .sort((a, b) => b.totals.total - a.totals.total);
  const best = rows[0]?.totals.total ?? 0;
  const winners = rows.filter((r) => r.totals.total === best);
  const names = winners.map((r) => r.seat.user.name);

  useEffect(() => playCelebrate(), []);

  return (
    <main className="screen results">
      <div className="winner-banner">
        <Sparkles
          colors={[
            ...winners.map((r) => tintOf(r.seat.tint).hue),
            'var(--accent)',
            'var(--strong)',
          ]}
          count={30}
        />
        <motion.h1
          className="wordmark"
          data-testid="winner"
          initial={{ opacity: 0, scale: 0.6, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={SPRING.pop}
        >
          {names.length === 1 ? `${names[0]} wins!` : `A tie: ${names.join(' and ')}!`}
        </motion.h1>
      </div>
      <ol className="standings">
        {rows.map(({ seat, totals, bonus }, rank) => {
          const top = totals.total === best;
          return (
            <motion.li
              key={seat.user.id}
              className={`panel standing${top ? ' top' : ''}`}
              style={tintVars(seat.tint, theme) as MotionStyle}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.soft, delay: 0.25 + rank * 0.12 }}
            >
              <div className="row">
                <span className="rank" aria-label={`Place ${rank + 1}`}>
                  {top ? <CrownIcon /> : rank + 1}
                </span>
                <Avatar user={seat.user} cdnBase={cdnBase} tint={seat.tint} />
                <strong className="standing-name">{seat.user.name}</strong>
                <strong className="total">
                  <CountUp value={totals.total} delay={0.35 + rank * 0.12} />
                </strong>
              </div>
              {bonus && <p className="quiet bonus-note">{bonus}</p>}
              <CoinNote line={coinLineFor(payout, seat.user.id)} still={still} />
              {multi && (
                <table className="card-totals">
                  <tbody>
                    {totals.cards.map((c, i) => (
                      <tr key={i}>
                        <th scope="row">Card {i + 1}</th>
                        <td>{c.raw}</td>
                        <td>{c.multiplier > 1 ? `×${c.multiplier} = ${c.total}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.li>
          );
        })}
      </ol>
      {balance && (
        <motion.p
          className="coin-balance"
          data-testid="coin-balance"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <span className="coin-icon">
            <CauldronCoinIcon />
          </span>
          {balance}
        </motion.p>
      )}
      <p className="quiet relaunch">Close and relaunch the Activity to play again.</p>
    </main>
  );
}
