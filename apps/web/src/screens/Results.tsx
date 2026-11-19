import { type GameState, playerTotal, type PlayerTotal, UPPER_BONUS } from '@rollhouse/rules';
import type { Lobby } from '@rollhouse/shared';
import { Avatar } from '../Avatar';

interface Props {
  game: GameState;
  lobby: Lobby;
  cdnBase: string;
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

export function Results({ game, lobby, cdnBase }: Props) {
  const multi = game.setup.cardsPerPlayer > 1;
  const rows = lobby.seats
    .map((s, i) => {
      const totals = playerTotal(game, i);
      return { seat: s, totals, bonus: upperBonusNote(totals, multi) };
    })
    .sort((a, b) => b.totals.total - a.totals.total);
  const best = rows[0]?.totals.total ?? 0;
  const winners = rows.filter((r) => r.totals.total === best).map((r) => r.seat.user.name);

  return (
    <main className="screen results">
      <h1 className="wordmark" data-testid="winner">
        {winners.length === 1 ? `${winners[0]} wins!` : `A tie: ${winners.join(' and ')}!`}
      </h1>
      <ol className="standings">
        {rows.map(({ seat, totals, bonus }) => (
          <li key={seat.user.id} className="panel">
            <div className="row">
              <Avatar user={seat.user} cdnBase={cdnBase} flavor={seat.flavor} />
              <strong>{seat.user.name}</strong>
              <strong className="total">{totals.total}</strong>
            </div>
            {bonus && <p className="quiet bonus-note">{bonus}</p>}
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
          </li>
        ))}
      </ol>
      <p className="quiet">Close and relaunch the Activity to play again.</p>
    </main>
  );
}
