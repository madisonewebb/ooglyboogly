import { useEffect, useMemo, useState } from 'react';
import {
  activePlayers,
  BOXES,
  type Box,
  type BoxOption,
  cardOptions,
  type GameState,
  isPlayerDone,
  ROLLS_PER_TURN,
} from '@rollhouse/rules';
import { type Lobby, MSG_HOLD, MSG_ROLL, MSG_SCORE, MSG_UNDO } from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import { BOX_LABELS } from '../labels';
import type { Table } from '../useTable';

interface Props {
  game: GameState;
  lobby: Lobby;
  table: Table;
  /** The viewer's seat, or null when watching. */
  seat: number | null;
  cdnBase: string;
}

interface Pick {
  card: number;
  box: Box;
  value: number;
}

const UPPER_COUNT = 6;

function Die({
  value,
  index,
  held,
  onToggle,
}: {
  value: number | null;
  index: number;
  held: boolean;
  onToggle: (() => void) | null;
}) {
  const label = value === null ? `Die ${index + 1}, not rolled` : `Die ${index + 1}: ${value}`;
  return (
    <button
      type="button"
      className={`die${held ? ' held' : ''}`}
      aria-label={held ? `${label}, held` : label}
      aria-pressed={held}
      disabled={!onToggle}
      onClick={onToggle ?? undefined}
    >
      {value ?? '–'}
    </button>
  );
}

export function Game({ game, lobby, table, seat, cdnBase }: Props) {
  const active = activePlayers(game);
  const [viewed, setViewed] = useState<number>(seat ?? active[0] ?? 0);
  const [pick, setPick] = useState<Pick | null>(null);
  const [confirming, setConfirming] = useState(false);

  const me = seat === null ? null : game.players[seat]!;
  const canAct = seat !== null && active.includes(seat);
  const mine = viewed === seat;
  const player = game.players[viewed]!;
  const turn = player.turn;
  const dice = turn.dice;
  const rollsLeft = ROLLS_PER_TURN - turn.rolls;

  // A new roll, a score or an undo clears any half-made choice.
  const myTurnKey = JSON.stringify(me?.turn ?? null);
  useEffect(() => {
    setPick(null);
    setConfirming(false);
  }, [myTurnKey]);

  /** options[card][box], only when the viewer is choosing where to write their own roll. */
  const options = useMemo(() => {
    if (!mine || !canAct || !dice) return null;
    return player.cards.map(
      (c) => new Map<Box, BoxOption>(cardOptions(c, dice).options.map((o) => [o.box, o])),
    );
  }, [mine, canAct, dice, player.cards]);

  const name = (s: number) => lobby.seats[s]?.user.name ?? `Seat ${s + 1}`;
  const status = (() => {
    if (game.setup.playStyle === 'turns') {
      const up = game.setup.turnOrder[game.pointer]!;
      if (up === seat) return 'Your turn';
      const away = lobby.seats[up]?.connected === false ? ' (away, waiting for them)' : '';
      return `${name(up)}'s turn${away}`;
    }
    const still = active.filter((s) => s !== seat).map(name);
    if (canAct) return 'Your go: roll whenever you like';
    if (seat !== null && isPlayerDone(game, seat)) {
      return `You're done. Still playing: ${still.join(', ')}`;
    }
    return `Still playing: ${still.join(', ')}`;
  })();

  const holdable = mine && canAct && dice !== null && rollsLeft > 0;
  const allHeld = turn.held.every(Boolean);
  const toggle = (i: number) =>
    holdable ? () => table.send(MSG_HOLD, { die: i, held: !turn.held[i] }) : null;

  const write = () => {
    if (!pick) return;
    if (pick.value === 0 && !confirming) return setConfirming(true);
    table.send(MSG_SCORE, { card: pick.card, box: pick.box });
    setPick(null);
    setConfirming(false);
  };

  const positions = [0, 1, 2, 3, 4];
  const last = me?.lastScore ?? null;

  return (
    <main className="screen game">
      <nav className="players" aria-label="Players">
        {lobby.seats.map((s, i) => (
          <button
            key={s.user.id}
            type="button"
            className={[
              'player',
              active.includes(i) ? 'lit' : '',
              s.connected ? '' : 'away',
              i === viewed ? 'viewing' : '',
            ].join(' ')}
            aria-pressed={i === viewed}
            onClick={() => setViewed(i)}
          >
            <Avatar user={s.user} cdnBase={cdnBase} />
            <span>{i === seat ? 'You' : s.user.name}</span>
          </button>
        ))}
      </nav>

      <p className="status" role="status">
        {status}
      </p>

      {!mine && <p className="quiet">Viewing {name(viewed)}&apos;s pad</p>}

      <section className="tray" aria-label="Dice">
        <div className="dice" data-testid="dice-tray">
          {positions
            .filter((i) => !turn.held[i])
            .map((i) => (
              <Die key={i} index={i} value={dice?.[i] ?? null} held={false} onToggle={toggle(i)} />
            ))}
        </div>
        <div className="shelf" aria-label="Held dice" data-testid="dice-shelf">
          {positions
            .filter((i) => turn.held[i])
            .map((i) => (
              <Die key={i} index={i} value={dice?.[i] ?? null} held onToggle={toggle(i)} />
            ))}
          {!turn.held.some(Boolean) && dice && mine && canAct && rollsLeft > 0 && (
            <span className="quiet">Tap dice to hold them</span>
          )}
        </div>
        {mine && canAct && (
          <button
            type="button"
            className="primary big"
            disabled={rollsLeft === 0 || allHeld}
            onClick={() => table.send(MSG_ROLL)}
          >
            {rollsLeft === 0 ? 'No rolls left' : `Roll (${rollsLeft} left)`}
          </button>
        )}
      </section>

      <section className="pad-wrap" aria-label={`${name(viewed)}'s score pad`}>
        <table className="pad">
          <thead>
            <tr>
              <th scope="col">Box</th>
              {player.cards.map((_, c) => (
                <th key={c} scope="col">
                  Card {c + 1}
                  {game.setup.multipliers && player.cards.length > 1 ? ` ×${c + 1}` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BOXES.map((box, row) => (
              <tr key={box} className={row === UPPER_COUNT ? 'lower-start' : ''}>
                <th scope="row">{BOX_LABELS[box].short}</th>
                {player.cards.map((card, c) => {
                  const filled = card.boxes[box];
                  const label = `Card ${c + 1} ${BOX_LABELS[box].long}`;
                  if (filled !== undefined) {
                    const stars = box === 'yatzy' && card.yatzyBonuses > 0;
                    return (
                      <td key={c} className="filled" aria-label={`${label}: ${filled}`}>
                        {filled}
                        {stars && (
                          <span className="stars" aria-label={`${card.yatzyBonuses} bonus`}>
                            {' '}
                            {'★'.repeat(card.yatzyBonuses)}
                          </span>
                        )}
                      </td>
                    );
                  }
                  const option = options?.[c]?.get(box);
                  if (!option) return <td key={c} aria-label={`${label}: open`} />;
                  const chosen = pick?.card === c && pick.box === box;
                  return (
                    <td key={c}>
                      <button
                        type="button"
                        className={`preview${chosen ? ' chosen' : ''}`}
                        disabled={!option.allowed}
                        aria-pressed={chosen}
                        aria-label={`${label}, ${option.value} points`}
                        onClick={() => {
                          setConfirming(false);
                          setPick({ card: c, box, value: option.value });
                        }}
                      >
                        {option.value}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pick && (
        <div className="write-bar" role="group" aria-label="Write it in">
          {confirming ? (
            <>
              <p>
                Put 0 in {BOX_LABELS[pick.box].long}
                {player.cards.length > 1 ? ` on card ${pick.card + 1}` : ''}?
              </p>
              <button type="button" className="primary" onClick={write}>
                Yes, put 0
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="primary big" onClick={write}>
              Write it in: {pick.value} in {BOX_LABELS[pick.box].long}
            </button>
          )}
        </div>
      )}

      {last && (
        <button type="button" onClick={() => table.send(MSG_UNDO)}>
          Undo {BOX_LABELS[last.box].long}
          {player.cards.length > 1 ? ` on card ${last.card + 1}` : ''}
        </button>
      )}
    </main>
  );
}
