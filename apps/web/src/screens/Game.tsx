import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DiceTray, type RollEvent } from '../dice/DiceTray';
import { flavorOf, flavorVars } from '../flavor';
import { BOX_LABELS } from '../labels';
import { playPop, unlockAudio } from '../sound';
import { usePrefs } from '../theme/prefs';
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

/** Whose dice are in the tray: the player up in Take turns, otherwise yourself (or who you're viewing). */
function trayPlayerOf(game: GameState, seat: number | null, viewed: number): number {
  if (game.setup.playStyle === 'turns') return game.setup.turnOrder[game.pointer]!;
  return seat ?? viewed;
}

/** Boxes filled since the last render of this pad, so they can pop in. */
function useNewlyFilled(game: GameState, player: number): Set<string> {
  const filled = useMemo(() => {
    const s = new Set<string>();
    game.players[player]!.cards.forEach((c, i) => {
      for (const box of BOXES) if (c.boxes[box] !== undefined) s.add(`${i}:${box}`);
    });
    return s;
  }, [game, player]);
  const prev = useRef<{ player: number; filled: Set<string> } | null>(null);
  const fresh = useMemo(() => {
    const before = prev.current;
    if (!before || before.player !== player) return new Set<string>();
    return new Set([...filled].filter((k) => !before.filled.has(k)));
  }, [filled, player]);
  useEffect(() => {
    prev.current = { player, filled };
    if (fresh.size > 0) playPop();
  }, [filled, player, fresh]);
  return fresh;
}

export function Game({ game, lobby, table, seat, cdnBase }: Props) {
  const { theme } = usePrefs();
  const active = activePlayers(game);
  const [viewed, setViewed] = useState<number>(seat ?? active[0] ?? 0);
  const [pick, setPick] = useState<Pick | null>(null);
  const [confirming, setConfirming] = useState(false);

  const turns = game.setup.playStyle === 'turns';
  const up = turns ? game.setup.turnOrder[game.pointer]! : null;

  // In Take turns, the pad follows whoever is up, so everyone watches scores land.
  useEffect(() => {
    if (up !== null) setViewed(up);
  }, [up]);

  const trayPlayer = trayPlayerOf(game, seat, viewed);
  const tray = game.players[trayPlayer]!;
  const turn = tray.turn;
  const dice = turn.dice;
  const rollsLeft = ROLLS_PER_TURN - turn.rolls;
  const canAct = seat !== null && active.includes(seat);
  const myTray = trayPlayer === seat && canAct;

  // Only rolls that arrive while this tray is showing animate.
  // Switching trays resets the mark in the same render, so an old roll never replays.
  const live = table.lastRoll;
  const anim = useRef({ tray: trayPlayer, from: (live?.index ?? -1) + 1 });
  if (anim.current.tray !== trayPlayer)
    anim.current = { tray: trayPlayer, from: (live?.index ?? -1) + 1 };
  const roll: RollEvent | null =
    live && live.player === trayPlayer && live.index >= anim.current.from
      ? { index: live.index, tumble: live.tumble, first: turn.rolls === 1 }
      : null;
  const [settled, setSettled] = useState(-1);
  const rolling = roll !== null && roll.index > settled;
  const onSettled = useCallback((index: number) => setSettled((s) => Math.max(s, index)), []);

  const player = game.players[viewed]!;
  const mine = viewed === seat;

  // A new roll, a score or an undo clears any half-made choice.
  const myTurnKey = JSON.stringify(seat === null ? null : game.players[seat]!.turn);
  useEffect(() => {
    setPick(null);
    setConfirming(false);
  }, [myTurnKey]);

  /** options[card][box], only when the viewer is choosing where to write their own roll. */
  const options = useMemo(() => {
    if (!mine || !canAct || !player.turn.dice || rolling) return null;
    const d = player.turn.dice;
    return player.cards.map(
      (c) => new Map<Box, BoxOption>(cardOptions(c, d).options.map((o) => [o.box, o])),
    );
  }, [mine, canAct, player, rolling]);

  const fresh = useNewlyFilled(game, viewed);

  const name = (s: number) => lobby.seats[s]?.user.name ?? `Seat ${s + 1}`;
  const status = (() => {
    if (turns) {
      if (up === seat) return 'Your turn';
      const away = lobby.seats[up!]?.connected === false ? ' (away, waiting for them)' : '';
      return `${name(up!)}'s turn${away}`;
    }
    const still = active.filter((s) => s !== seat).map(name);
    if (canAct) return 'Your go: roll whenever you like';
    if (seat !== null && isPlayerDone(game, seat)) {
      return `You're done. Still playing: ${still.join(', ')}`;
    }
    return `Still playing: ${still.join(', ')}`;
  })();

  const holdable = myTray && dice !== null && rollsLeft > 0 && !rolling;
  const allHeld = turn.held.every(Boolean);
  const toggle = holdable
    ? (i: number) => table.send(MSG_HOLD, { die: i, held: !turn.held[i] })
    : null;

  const write = () => {
    if (!pick) return;
    if (pick.value === 0 && !confirming) return setConfirming(true);
    table.send(MSG_SCORE, { card: pick.card, box: pick.box });
    setPick(null);
    setConfirming(false);
  };

  const last = seat === null ? null : game.players[seat]!.lastScore;
  const multi = player.cards.length > 1;
  const viewedFlavor = lobby.seats[viewed]?.flavor;

  return (
    <main className="screen game" onPointerDown={unlockAudio}>
      <header className="topbar">
        <span className="wordmark small">Rollhouse</span>
        <nav className="players" aria-label="Players">
          {lobby.seats.map((s, i) => (
            <button
              key={s.user.id}
              type="button"
              className={[
                'player',
                active.includes(i) && (turns ? i === up : true) ? 'lit' : '',
                s.connected ? '' : 'away',
                i === viewed ? 'viewing' : '',
              ].join(' ')}
              style={flavorVars(s.flavor, theme)}
              aria-pressed={i === viewed}
              onClick={() => setViewed(i)}
            >
              <Avatar user={s.user} cdnBase={cdnBase} flavor={s.flavor} />
              <span>{i === seat ? 'You' : s.user.name}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="table-layout">
        <section className="tray-col" aria-label="Dice">
          <p className={`status${up === seat && turns ? ' yours' : ''}`} role="status">
            {status}
          </p>
          <DiceTray
            values={dice ?? [null, null, null, null, null]}
            held={turn.held}
            roll={roll}
            rolling={rolling}
            onToggle={toggle}
            onSettled={onSettled}
            candy={flavorOf(lobby.seats[trayPlayer]?.flavor).candy}
          />
          <p className="hint quiet">
            {holdable && !turn.held.some(Boolean)
              ? 'Tap dice to hold them'
              : holdable
                ? 'Held dice sit on the shelf'
                : ' '}
          </p>
          {myTray && (
            <button
              type="button"
              className="primary big roll"
              disabled={rollsLeft === 0 || allHeld || rolling}
              onClick={() => {
                unlockAudio();
                table.send(MSG_ROLL);
              }}
            >
              {rollsLeft === 0 ? 'No rolls left' : `Roll (${rollsLeft} left)`}
            </button>
          )}

          {pick && (
            <div className="write-bar" role="group" aria-label="Write it in">
              {confirming ? (
                <>
                  <p>
                    Put 0 in {BOX_LABELS[pick.box].long}
                    {multi ? ` on card ${pick.card + 1}` : ''}?
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
            <button type="button" className="undo" onClick={() => table.send(MSG_UNDO)}>
              Undo {BOX_LABELS[last.box].long}
              {multi ? ` on card ${last.card + 1}` : ''}
            </button>
          )}
        </section>

        <section
          className="pad-col"
          aria-label={`${name(viewed)}'s score pad`}
          style={flavorVars(viewedFlavor, theme)}
        >
          <h2 className="pad-title">
            <Avatar user={lobby.seats[viewed]!.user} cdnBase={cdnBase} flavor={viewedFlavor} />
            {mine ? 'Your pad' : `${name(viewed)}'s pad`}
          </h2>
          <table className="pad">
            <thead>
              <tr>
                <th scope="col" className="box-col">
                  <span className="sr-only">Box</span>
                </th>
                {player.cards.map((_, c) => (
                  <th key={c} scope="col">
                    Card {c + 1}
                    {game.setup.multipliers && multi ? (
                      <span className="mult"> ×{c + 1}</span>
                    ) : null}
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
                      const isNew = fresh.has(`${c}:${box}`);
                      return (
                        <td key={c} className="filled" aria-label={`${label}: ${filled}`}>
                          {isNew && <span className="pop-ring" aria-hidden="true" />}
                          <motion.span
                            className="score"
                            initial={isNew ? { scale: 1.9, opacity: 0 } : false}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                          >
                            {filled}
                          </motion.span>
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
      </div>
    </main>
  );
}
