import { AnimatePresence, type HTMLMotionProps, motion, useIsPresent } from 'motion/react';
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

  // Your turn starting (the first one too) gets a little chime and a pulse on your face.
  const myTurn = turns ? up === seat : canAct;
  const [turnPulse, setTurnPulse] = useState(0);
  const wasMine = useRef(false);
  useEffect(() => {
    const fresh = myTurn && !wasMine.current;
    wasMine.current = myTurn;
    if (!fresh) return;
    setTurnPulse((n) => n + 1);
    // After the last player's score pop has had its moment.
    const id = setTimeout(playTurn, 350);
    return () => clearTimeout(id);
  }, [myTurn]);

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

  /**
   * Hold to shake: pressing Roll (or holding Space) brings the cup out and
   * rattles it until you let go, which sends the roll. A quick click is the
   * same with a short shake, and the rattle covers the trip to the server.
   */
  const [shake, setShake] = useState<{ start: number; from: number; sent: boolean } | null>(null);
  const pressing = useRef<'pointer' | 'key' | null>(null);
  const shaking = shake !== null;

  /** Per card: each open box's option, and whether this roll earns a Yatzy bonus there. */
  const options = useMemo(() => {
    if (!mine || !canAct || !player.turn.dice || rolling || shaking) return null;
    const d = player.turn.dice;
    return player.cards.map((c) => {
      const o = cardOptions(c, d);
      return { boxes: new Map<Box, BoxOption>(o.options.map((x) => [x.box, x])), bonus: o.bonus };
    });
  }, [mine, canAct, player, rolling, shaking]);

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

  const holdable = myTray && dice !== null && rollsLeft > 0 && !rolling && !shaking;
  const allHeld = turn.held.every(Boolean);
  const toggle = holdable
    ? (i: number) => table.send(MSG_HOLD, { die: i, held: !turn.held[i] })
    : null;
  const canRoll = myTray && rollsLeft > 0 && !allHeld && !rolling && !shaking;
  const rollNow = () => {
    if (!canRoll) return;
    unlockAudio();
    setPick(null);
    table.send(MSG_ROLL);
  };
  const press = (how: 'pointer' | 'key') => {
    if (!canRoll || pressing.current) return;
    unlockAudio();
    pressing.current = how;
    setPick(null);
    setConfirming(false);
    setShake({ start: performance.now(), from: (live?.index ?? -1) + 1, sent: false });
  };
  const letGo = () => {
    if (!pressing.current) return;
    pressing.current = null;
    setShake((s) => s && { ...s, sent: true });
    table.send(MSG_ROLL);
  };

  // The roll is back: the tray has taken over the shake.
  useEffect(() => {
    if (shake && live && live.player === seat && live.index >= shake.from) setShake(null);
  }, [live, shake, seat]);
  // Held a very long time: roll anyway. Sent but nothing came back (an error): put the dice back.
  const letGoRef = useRef(letGo);
  letGoRef.current = letGo;
  useEffect(() => {
    if (!shake) return;
    const id = shake.sent
      ? setTimeout(() => setShake(null), 4000)
      : setTimeout(() => letGoRef.current(), 8000);
    return () => clearTimeout(id);
  }, [shake]);

  const write = () => {
    if (!pick) return;
    if (pick.value === 0 && !confirming) return setConfirming(true);
    table.send(MSG_SCORE, { card: pick.card, box: pick.box });
    setPick(null);
    setConfirming(false);
  };

  // Keyboard play: Space rolls (hold it to shake), 1 to 5 hold dice, Enter writes in, Escape lets go.
  const keys = useRef({ press, letGo, toggle, write, pick });
  keys.current = { press, letGo, toggle, write, pick };
  useEffect(() => {
    const isRollKey = (e: KeyboardEvent) => e.key === ' ' || e.key === 'r' || e.key === 'R';
    const onUp = (e: KeyboardEvent) => {
      if (isRollKey(e) && pressing.current === 'key') {
        e.preventDefault();
        keys.current.letGo();
      }
    };
    // Switching away mid-shake: roll rather than shake forever.
    const onBlur = () => pressing.current === 'key' && keys.current.letGo();
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) {
        if (e.repeat && isRollKey(e) && pressing.current) e.preventDefault();
        return;
      }
      const k = keys.current;
      if (isRollKey(e) && !onControl(e.target)) {
        e.preventDefault();
        k.press('key');
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
    addEventListener('keyup', onUp);
    addEventListener('blur', onBlur);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onUp);
      removeEventListener('blur', onBlur);
    };
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

  const hint = shaking
    ? shake.sent
      ? ''
      : 'Let go to roll.'
    : holdable
      ? turn.held.some(Boolean)
        ? 'Held dice wait on the shelf. Click one to put it back.'
        : 'Click dice to hold them. Hold Roll to shake longer.'
      : myTray && dice && !rolling && rollsLeft === 0
        ? 'Pick a box on your pad.'
        : canRoll
          ? 'Hold Roll to shake the cup longer.'
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
                {myTurn && turnPulse > 0 && trayPlayer === seat && (
                  <span key={turnPulse} className="turn-pulse" aria-hidden="true" />
                )}
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
            shake={myTray ? shake : null}
          />

          <div className="tray-actions">
            <AnimatePresence mode="popLayout" initial={false}>
              {myTray && pick && confirming ? (
                <Swap
                  key="confirm"
                  className="confirm-zero"
                  role="group"
                  aria-label="Write a zero?"
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
                </Swap>
              ) : myTray && pick ? (
                <Swap key="write" className="action-row">
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
                </Swap>
              ) : myTray ? (
                <Swap key="roll" className="action-row">
                  <button
                    type="button"
                    className={`candy big roll${rolling || shaking ? ' busy' : ''}`}
                    aria-label={
                      rollsLeft === 0 && !rolling ? 'No rolls left' : `Roll (${rollsLeft} left)`
                    }
                    aria-keyshortcuts="Space"
                    disabled={!canRoll && !shaking}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // No capture: letting go elsewhere still ends it below.
                      }
                      press('pointer');
                    }}
                    onPointerUp={() => pressing.current === 'pointer' && letGo()}
                    onPointerCancel={() => pressing.current === 'pointer' && letGo()}
                    onLostPointerCapture={() => pressing.current === 'pointer' && letGo()}
                    // Enter or Space on the focused button: a plain roll.
                    onClick={(e) => e.detail === 0 && rollNow()}
                  >
                    {shaking && !shake.sent
                      ? 'Shaking…'
                      : rolling || shaking
                        ? 'Rolling…'
                        : rollsLeft === 0
                          ? 'No rolls left'
                          : turn.rolls === 0
                            ? 'Roll'
                            : 'Roll again'}
                    {canRoll && <kbd aria-hidden="true">Space</kbd>}
                  </button>
                </Swap>
              ) : null}
            </AnimatePresence>
            <p className="hint quiet">{hint || ' '}</p>
            <AnimatePresence initial={false}>
              {last && (
                <Swap key={`${last.card}:${last.box}`}>
                  <button type="button" className="undo" onClick={() => table.send(MSG_UNDO)}>
                    <UndoIcon /> Undo {where(last)}
                  </button>
                </Swap>
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
                <Swap className="look-only" role="note">
                  <p>You can only write on your own pad.</p>
                  <button type="button" onClick={() => setViewed(seat)}>
                    Back to your pad
                  </button>
                </Swap>
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

/**
 * One of those actions. While it animates out, the one replacing it is already
 * there, so the old one stops taking clicks and leaves the accessibility tree
 * at once: there's never a second Roll button to press or to hear.
 */
function Swap(props: HTMLMotionProps<'div'>) {
  const present = useIsPresent();
  return (
    <motion.div {...ACTION} {...props} {...(present ? {} : { inert: true, 'aria-hidden': true })} />
  );
}
