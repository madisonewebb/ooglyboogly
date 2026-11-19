import { type GameState, playerTotal } from '@rollhouse/rules';
import type { Lobby } from '@rollhouse/shared';
import { Avatar } from '../Avatar';

interface Props {
  game: GameState;
  lobby: Lobby;
  cdnBase: string;
}

export function Results({ game, lobby, cdnBase }: Props) {
  const rows = lobby.seats
    .map((s, i) => ({ seat: s, totals: playerTotal(game, i) }))
    .sort((a, b) => b.totals.total - a.totals.total);
  const best = rows[0]?.totals.total ?? 0;
  const winners = rows.filter((r) => r.totals.total === best).map((r) => r.seat.user.name);
  const multi = game.setup.cardsPerPlayer > 1;

  return (
    <main className="screen results">
      <h1 className="wordmark" data-testid="winner">
        {winners.length === 1 ? `${winners[0]} wins!` : `A tie: ${winners.join(' and ')}!`}
      </h1>
      <ol className="standings">
        {rows.map(({ seat, totals }) => (
          <li key={seat.user.id} className="panel">
            <div className="row">
              <Avatar user={seat.user} cdnBase={cdnBase} flavor={seat.flavor} />
              <strong>{seat.user.name}</strong>
              <strong className="total">{totals.total}</strong>
            </div>
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
