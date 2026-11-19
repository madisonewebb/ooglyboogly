import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  activePlayers,
  BOXES,
  type Box,
  type BoxOption,
  cardOptions,
  cardTotal,
  type GameState,
  isPlayerDone,
  MAX_YATZY_BONUSES,
  ROLLS_PER_TURN,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
} from '@rollhouse/rules';
import { type Lobby, MSG_HOLD, MSG_ROLL, MSG_SCORE, MSG_UNDO } from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import { DiceTray, type RollEvent } from '../dice/DiceTray';
import { flavorOf, flavorVars } from '../flavor';
import { CheckIcon, DieGlyph, UndoIcon } from '../icons';
import { BOX_LABELS, BOX_POINTS } from '../labels';
import { playBonus, playPop, playTurn, unlockAudio } from '../sound';
import { DURATION, EASE_OUT, SPRING } from '../theme/motion';
import { usePrefs } from '../theme/prefs';
import type { Table } from '../useTable';
import { PAD_PANEL_ID, padTabId, PadTabs } from './PadTabs';

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

/** Per player, a counter bumped each time they score while you're not looking at their pad. */
function useScorePulses(
  game: GameState,
  seat: number | null,
  viewed: number,
  on: boolean,
): Record<number, number> {
  const counts = game.players.map((p) =>
    p.cards.reduce((n, c) => n + BOXES.filter((b) => c.boxes[b] !== undefined).length, 0),
  );
  const key = counts.join(',');
  const prev = useRef<number[] | null>(null);
  const [pulses, setPulses] = useState<Record<number, number>>({});
  useEffect(() => {
    const before = prev.current;
    const now = key.split(',').map(Number);
    prev.current = now;
    if (!on || !before) return;
    const scored = now.flatMap((n, i) =>
      n > (before[i] ?? n) && i !== seat && i !== viewed ? [i] : [],
    );
    if (scored.length === 0) return;
    setPulses((p) => {
      const next = { ...p };
      for (const i of scored) next[i] = (next[i] ?? 0) + 1;
      return next;
    });
  }, [key, on, seat, viewed]);
  return pulses;
}

/** Plays a triad when one of your cards newly earns its upper bonus. */
function useBonusChime(game: GameState, seat: number | null) {
  const earned =
    seat === null
      ? 0
      : game.players[seat]!.cards.filter(
          (c, i) => cardTotal(c, i, false).upper >= UPPER_BONUS_THRESHOLD,
        ).length;
  const prev = useRef(earned);
  useEffect(() => {
    if (earned > prev.current) playBonus();
    prev.current = earned;
  }, [earned]);
}

/** Keys don't steal from text fields, and Space/Enter stay with a focused control. */
function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
}
function onControl(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el?.closest?.('button, a, [role="tab"]');
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
  // It only moves when the turn changes, so a tab you pick stays put until then.
  useEffect(() => {
    if (up !== null) setViewed(up);
  }, [up]);

  // Your turn coming round gets a soft chime.
  const wasUp = useRef(up);
  useEffect(() => {
    if (up !== null && up === seat && wasUp.current !== up) playTurn();
    wasUp.current = up;
  }, [up, seat]);

  // In Everyone at once, a score on someone else's pad pulses their tab.
  const pulses = useScorePulses(game, seat, viewed, !turns);
  useBonusChime(game, seat);

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

  /** Per card: each open box's option, and whether this roll earns a Yatzy bonus there. */
  const options = useMemo(() => {
    if (!mine || !canAct || !player.turn.dice || rolling) return null;
    const d = player.turn.dice;
    return player.cards.map((c) => {
      const o = cardOptions(c, d);
      return { boxes: new Map<Box, BoxOption>(o.options.map((x) => [x.box, x])), bonus: o.bonus };
    });
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
  const yours = (turns && up === seat) || (!turns && canAct);

  const holdable = myTray && dice !== null && rollsLeft > 0 && !rolling;
  const allHeld = turn.held.every(Boolean);
  const toggle = holdable
    ? (i: number) => table.send(MSG_HOLD, { die: i, held: !turn.held[i] })
    : null;
  const canRoll = myTray && rollsLeft > 0 && !allHeld && !rolling;
  const rollNow = () => {
    if (!canRoll) return;
    unlockAudio();
    setPick(null);
    table.send(MSG_ROLL);
  };

  const write = () => {
    if (!pick) return;
    if (pick.value === 0 && !confirming) return setConfirming(true);
    table.send(MSG_SCORE, { card: pick.card, box: pick.box });
    setPick(null);
    setConfirming(false);
  };

  // Keyboard play: Space rolls, 1 to 5 hold dice, Enter writes in, Escape lets go.
  const keys = useRef({ rollNow, toggle, write, pick });
  keys.current = { rollNow, toggle, write, pick };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const k = keys.current;
      if ((e.key === ' ' || e.key === 'r' || e.key === 'R') && !onControl(e.target)) {
        e.preventDefault();
        k.rollNow();
      } else if (/^[1-5]$/.test(e.key) && k.toggle) {
        k.toggle(Number(e.key) - 1);
      } else if (e.key === 'Enter' && k.pick && !onControl(e.target)) {
        e.preventDefault();
        k.write();
      } else if (e.key === 'Escape' && k.pick) {
        setPick(null);
        setConfirming(false);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const last = seat === null ? null : game.players[seat]!.lastScore;
  const multi = player.cards.length > 1;
  const viewedFlavor = lobby.seats[viewed]?.flavor;
  const trayFlavor = lobby.seats[trayPlayer]?.flavor;
  const trayUser = lobby.seats[trayPlayer]?.user;
  // Your go, but you're looking at someone else's pad: say so, with a way back.
  const lookingAway = !mine && seat !== null && canAct && (!turns || up === seat);
  const where = (p: { card: number; box: Box }) =>
    `${BOX_LABELS[p.box].long}${multi ? ` on card ${p.card + 1}` : ''}`;

  const hint = holdable
    ? turn.held.some(Boolean)
      ? 'Held dice wait on the shelf. Click one to put it back.'
      : 'Click dice to hold them, then roll the rest.'
    : myTray && dice && !rolling && rollsLeft === 0
      ? 'Pick a box on your pad.'
      : '';

  return (
    <main className="screen game" onPointerDown={unlockAudio}>
      <header className="topbar">
        <span className="wordmark small">Rollhouse</span>
      </header>

      <div className="table-layout">
        <section className="tray-col" aria-label="Dice">
          <div
            className={`turn-banner${yours ? ' yours' : ''}`}
            style={flavorVars(trayFlavor, theme)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={trayPlayer}
                className="turn-face"
                initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, transition: SPRING.pop }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: DURATION.fast } }}
              >
                {trayUser && <Avatar user={trayUser} cdnBase={cdnBase} flavor={trayFlavor} />}
              </motion.span>
            </AnimatePresence>
            <p className="status" role="status">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={status}
                  className="status-text"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: SPRING.snappy }}
                  exit={{ opacity: 0, y: -10, transition: { duration: DURATION.fast } }}
                >
                  {status}
                </motion.span>
              </AnimatePresence>
            </p>
            {dice !== null || turn.rolls > 0 || yours ? (
              <span className="roll-dots" aria-hidden="true" title={`${rollsLeft} rolls left`}>
                {Array.from({ length: ROLLS_PER_TURN }, (_, i) => (
                  <span key={i} className={i < rollsLeft ? 'on' : ''} />
                ))}
              </span>
            ) : null}
          </div>

          <DiceTray
            values={dice ?? [null, null, null, null, null]}
            held={turn.held}
            roll={roll}
            rolling={rolling}
            onToggle={toggle}
            onSettled={onSettled}
            candy={flavorOf(trayFlavor).candy}
          />

          <div className="tray-actions">
            <AnimatePresence mode="popLayout" initial={false}>
              {myTray && pick && confirming ? (
                <motion.div
                  key="confirm"
                  className="confirm-zero"
                  role="group"
                  aria-label="Write a zero?"
                  {...ACTION}
                >
                  <p>Put 0 in {where(pick)}?</p>
                  <div className="confirm-buttons">
                    <button type="button" className="candy" onClick={write}>
                      Yes, put 0
                    </button>
                    <button type="button" onClick={() => setConfirming(false)}>
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : myTray && pick ? (
                <motion.div key="write" className="action-row" {...ACTION}>
                  <button type="button" className="candy big write" onClick={write}>
                    <CheckIcon /> Write it in: {pick.value} in {where(pick)}
                  </button>
                  {rollsLeft > 0 && !allHeld && (
                    <button
                      type="button"
                      className="roll-again"
                      aria-label={`Roll (${rollsLeft} left)`}
                      onClick={rollNow}
                    >
                      Roll again
                    </button>
                  )}
                </motion.div>
              ) : myTray ? (
                <motion.div key="roll" className="action-row" {...ACTION}>
                  <button
                    type="button"
                    className={`candy big roll${rolling ? ' busy' : ''}`}
                    aria-label={
                      rollsLeft === 0 && !rolling ? 'No rolls left' : `Roll (${rollsLeft} left)`
                    }
                    aria-keyshortcuts="Space"
                    disabled={!canRoll}
                    onClick={rollNow}
                  >
                    {rolling
                      ? 'Rolling…'
                      : rollsLeft === 0
                        ? 'No rolls left'
                        : turn.rolls === 0
                          ? 'Roll'
                          : 'Roll again'}
                    {canRoll && <kbd aria-hidden="true">Space</kbd>}
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p className="hint quiet">{hint || ' '}</p>
            <AnimatePresence initial={false}>
              {last && (
                <motion.button
                  key={`${last.card}:${last.box}`}
                  type="button"
                  className="undo"
                  onClick={() => table.send(MSG_UNDO)}
                  {...ACTION}
                >
                  <UndoIcon /> Undo {where(last)}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section
          className="pad-col"
          aria-label={`${name(viewed)}'s score pad`}
          style={flavorVars(viewedFlavor, theme)}
        >
          <PadTabs
            lobby={lobby}
            cdnBase={cdnBase}
            seat={seat}
            viewed={viewed}
            onView={setViewed}
            up={up}
            done={(s) => isPlayerDone(game, s)}
            pulses={pulses}
          />
          <div id={PAD_PANEL_ID} role="tabpanel" aria-labelledby={padTabId(viewed)}>
            <h2 className="pad-title">{mine ? 'Your pad' : `${name(viewed)}'s pad`}</h2>
            <AnimatePresence initial={false}>
              {lookingAway && (
                <motion.div className="look-only" role="note" {...ACTION}>
                  <p>You can only write on your own pad.</p>
                  <button type="button" onClick={() => setViewed(seat)}>
                    Back to your pad
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="pad-sheet">
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
                    <Fragment key={box}>
                      {row === UPPER_COUNT && (
                        <tr className="upper-row">
                          <th scope="row">Upper bonus</th>
                          {player.cards.map((card, c) => {
                            const upper = cardTotal(card, c, false).upper;
                            const earned = upper >= UPPER_BONUS_THRESHOLD;
                            return (
                              <td
                                key={c}
                                aria-label={
                                  earned
                                    ? `Card ${c + 1} upper bonus: earned, ${UPPER_BONUS} points`
                                    : `Card ${c + 1} upper bonus: ${upper} of ${UPPER_BONUS_THRESHOLD}`
                                }
                              >
                                {earned ? (
                                  <motion.span
                                    className="bonus-tag"
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={SPRING.pop}
                                  >
                                    +{UPPER_BONUS}
                                  </motion.span>
                                ) : (
                                  <span className="upper-progress" aria-hidden="true">
                                    <span className="meter">
                                      <span
                                        style={{
                                          width: `${Math.min(100, (upper / UPPER_BONUS_THRESHOLD) * 100)}%`,
                                        }}
                                      />
                                    </span>
                                    <span className="count">
                                      {upper}/{UPPER_BONUS_THRESHOLD}
                                    </span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      <tr className={row === UPPER_COUNT ? 'lower-start' : ''}>
                        <th scope="row">
                          <span className="box-label">
                            {row < UPPER_COUNT && <DieGlyph n={row + 1} />}
                            {BOX_LABELS[box].short}
                            {BOX_POINTS[box] !== undefined && (
                              <span className="box-points" aria-hidden="true">
                                {BOX_POINTS[box]}
                              </span>
                            )}
                          </span>
                        </th>
                        {player.cards.map((card, c) => {
                          const filled = card.boxes[box];
                          const label = `Card ${c + 1} ${BOX_LABELS[box].long}`;
                          if (filled !== undefined) {
                            const isNew = fresh.has(`${c}:${box}`);
                            return (
                              <td key={c} className="filled" aria-label={`${label}: ${filled}`}>
                                {isNew && <span className="pop-ring" aria-hidden="true" />}
                                <motion.span
                                  className="score"
                                  initial={isNew ? { scale: 2, opacity: 0, rotate: -10 } : false}
                                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                  transition={SPRING.pop}
                                >
                                  {filled}
                                </motion.span>
                              </td>
                            );
                          }
                          const option = options?.[c]?.boxes.get(box);
                          if (!option) return <td key={c} aria-label={`${label}: open`} />;
                          const chosen = pick?.card === c && pick.box === box;
                          const bonus = option.allowed && options![c]!.bonus;
                          const scores = option.allowed && option.value > 0;
                          return (
                            <td key={c}>
                              <button
                                type="button"
                                className={[
                                  'preview',
                                  scores ? 'scores' : 'zero',
                                  chosen ? 'chosen' : '',
                                ].join(' ')}
                                style={{ ['--i' as string]: row + c }}
                                disabled={!option.allowed}
                                aria-pressed={chosen}
                                aria-label={`${label}, ${option.value} points${bonus ? ' plus a 100 point Yatzy bonus' : ''}${chosen ? '. Press again to write it in' : ''}`}
                                onClick={() => {
                                  if (chosen) return write();
                                  setConfirming(false);
                                  setPick({ card: c, box, value: option.value });
                                }}
                              >
                                {bonus && <span className="bonus-tag">+100</span>}
                                {chosen && <CheckIcon />}
                                {option.value}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  ))}
                  <tr className="bonus-row">
                    <th scope="row">Yatzy bonus</th>
                    {player.cards.map((card, c) => (
                      <td
                        key={c}
                        aria-label={`Card ${c + 1} Yatzy bonus: ${card.yatzyBonuses} of ${MAX_YATZY_BONUSES}`}
                      >
                        <span className="bonus-boxes" aria-hidden="true">
                          {Array.from({ length: MAX_YATZY_BONUSES }, (_, i) => (
                            <span key={i} className={i < card.yatzyBonuses ? 'earned' : ''}>
                              {i < card.yatzyBonuses ? '✓' : ''}
                            </span>
                          ))}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/** Action buttons swap in place: a quick rise and fade, so the next thing to do is ready at once. */
const ACTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};
