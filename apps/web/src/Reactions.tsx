/**
 * Stickers anyone at the table can send: a button opens a tray of the ghost
 * art, and every sticker sent floats up over the dice on everyone's screen
 * with the sender's name. The server allows one per person every 1.2s.
 */
import { useEffect, useRef, useState } from 'react';
import {
  type Lobby,
  MSG_REACT,
  type ReactionMessage,
  STICKER_IDS,
  type StickerId,
  STICKER_PACKS,
} from '@rollhouse/shared';
import babyYahtzee from './art/stickers/baby_yahtzee.webp';
import cheering from './art/stickers/cheering_ghost.webp';
import dontShitOnOnes from './art/stickers/dont_shit_on_ones.webp';
import heart from './art/stickers/heart_ghost.webp';
import ooglyBoogly from './art/stickers/oogly_boogly_hex.webp';
import sleeping from './art/stickers/sleeping_ghost.webp';
import steamingGarbage from './art/stickers/steaming_garbage.webp';
import stressed from './art/stickers/stressed_ghost.webp';
import sunglasses from './art/stickers/sunglasses_ghost.webp';
import broom from './art/stickers/packs/broom.svg';
import cackle from './art/stickers/packs/cackle.svg';
import foresaw from './art/stickers/packs/foresaw.svg';
import mischief from './art/stickers/packs/mischief.svg';
import moonMood from './art/stickers/packs/moonMood.svg';
import ribbit from './art/stickers/packs/ribbit.svg';
import { useWallet } from './shop/WalletContext';
import {
  DEFAULT_SLOTS,
  isTypingTarget,
  loadSlots,
  MAX_SLOTS,
  moveSlot,
  saveSlots,
  toggleSlot,
} from './hotbar';
import { playPop } from './sound';
import { usePrefs } from './theme/prefs';

export const STICKERS: Record<StickerId, { art: string; label: string }> = {
  cheering: { art: cheering, label: 'Cheering' },
  heart: { art: heart, label: 'Love it' },
  sunglasses: { art: sunglasses, label: 'Too cool' },
  sleeping: { art: sleeping, label: 'Sleepy' },
  babyYahtzee: { art: babyYahtzee, label: 'Baby Yahtzee' },
  ooglyBoogly: { art: ooglyBoogly, label: 'Oogly boogly!' },
  dontShitOnOnes: { art: dontShitOnOnes, label: "Don't shit on ones" },
  steamingGarbage: { art: steamingGarbage, label: 'Steaming garbage' },
  stressed: { art: stressed, label: 'Stressed' },
  // From the sticker packs in the shop. Placeholders until the Nano Banana art lands.
  cackle: { art: cackle, label: 'Cackle' },
  mischief: { art: mischief, label: 'Mischief' },
  ribbit: { art: ribbit, label: 'Ribbit' },
  foresaw: { art: foresaw, label: 'I foresaw this' },
  moonMood: { art: moonMood, label: 'Moon mood' },
  broom: { art: broom, label: 'Off I go' },
};

/**
 * The stickers a player may send: the free ones, then each sticker pack they own,
 * in the order the shop lists the packs. (The server checks this again.)
 */
export function stickersFor(owned: readonly string[] | undefined): StickerId[] {
  const fromPacks = STICKER_PACKS.filter((p) => owned?.includes(p.id)).flatMap((p) => p.stickers);
  return [...STICKER_IDS, ...fromPacks];
}

/** How long a sticker floats before it's gone. */
const FLOAT_MS = 2600;

/** The hotbar: your favorite stickers in a row, one click (or key 1-9) each. */
export function ReactionPicker({ send }: { send: (type: string, body: unknown) => void }) {
  const stickers = stickersFor(useWallet()?.owned);
  const [saved, setSlots] = useState(loadSlots);
  // Only stickers you may send fill the bar (a pack you no longer own drops out).
  const slots = saved.filter((id) => stickers.includes(id));
  const [editing, setEditing] = useState(false);
  const sendRef = useRef(send);
  sendRef.current = send;

  const update = (next: StickerId[]) => {
    setSlots(next);
    saveSlots(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const id = slots[Number(e.key) - 1];
      if (id) sendRef.current(MSG_REACT, { sticker: id });
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [slots]);

  return (
    <div className="hotbar">
      <div className="hotbar-row" role="group" aria-label="Stickers">
        {slots.map((id, i) => (
          <button
            key={id}
            type="button"
            className="hotbar-slot"
            aria-label={`${STICKERS[id].label} (${i + 1})`}
            title={`${STICKERS[id].label} (${i + 1})`}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => send(MSG_REACT, { sticker: id })}
          >
            <img src={STICKERS[id].art} alt="" width={36} height={36} />
            <span className="hotbar-key" aria-hidden="true">
              {i + 1}
            </span>
          </button>
        ))}
        <button
          type="button"
          className="hotbar-edit"
          title="Choose favorite stickers"
          aria-expanded={editing}
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing && (
        <div className="hotbar-editor">
          <p className="hotbar-hint">Tap a sticker to add or remove it. Arrows reorder.</p>
          <ol className="hotbar-order">
            {slots.map((id, i) => (
              <li key={id}>
                <button
                  type="button"
                  aria-label={`Move ${STICKERS[id].label} left`}
                  disabled={i === 0}
                  onClick={() => update(moveSlot(slots, i, -1))}
                >
                  ‹
                </button>
                <img src={STICKERS[id].art} alt="" width={28} height={28} />
                <button
                  type="button"
                  aria-label={`Move ${STICKERS[id].label} right`}
                  disabled={i === slots.length - 1}
                  onClick={() => update(moveSlot(slots, i, 1))}
                >
                  ›
                </button>
              </li>
            ))}
          </ol>
          <div className="hotbar-pool" role="group" aria-label="All stickers">
            {stickers.map((id) => {
              const on = slots.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className="hotbar-slot"
                  aria-pressed={on}
                  aria-label={STICKERS[id].label}
                  title={STICKERS[id].label}
                  disabled={!on && slots.length >= MAX_SLOTS}
                  onClick={() => update(toggleSlot(slots, id))}
                >
                  <img src={STICKERS[id].art} alt="" width={36} height={36} />
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => update([...DEFAULT_SLOTS])}>
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

/** Stickers floating up over the tray, newest on top. */
export function ReactionFloats({
  reactions,
  lobby,
}: {
  reactions: readonly ReactionMessage[];
  lobby: Lobby;
}) {
  const { reducedMotion } = usePrefs();
  const [now, setNow] = useState(() => Date.now());
  // When each sticker arrived on this screen.
  const arrived = useRef(new Map<number, number>());
  const newest = reactions.at(-1)?.id;

  useEffect(() => {
    if (newest === undefined || arrived.current.has(newest)) return;
    for (const r of reactions)
      if (!arrived.current.has(r.id)) arrived.current.set(r.id, Date.now());
    setNow(Date.now());
    playPop();
    const id = setTimeout(() => setNow(Date.now()), FLOAT_MS + 50);
    return () => clearTimeout(id);
  }, [newest, reactions]);

  const name = (userId: string) =>
    [...lobby.seats.map((s) => s.user), ...lobby.spectators].find((u) => u.id === userId)?.name ??
    'Someone';
  const live = reactions.filter((r) => now - (arrived.current.get(r.id) ?? 0) < FLOAT_MS);

  return (
    <div className="reaction-floats" aria-live="polite">
      {live.map((r) => (
        <figure
          key={r.id}
          className={`reaction${reducedMotion ? ' still' : ''}`}
          // Spread them across the tray, so a burst doesn't stack in one spot.
          style={{ ['--x' as string]: `${18 + ((r.id * 37) % 64)}%` }}
        >
          <img
            src={STICKERS[r.sticker].art}
            alt={STICKERS[r.sticker].label}
            width={112}
            height={112}
          />
          <figcaption>{name(r.userId)}</figcaption>
        </figure>
      ))}
    </div>
  );
}
