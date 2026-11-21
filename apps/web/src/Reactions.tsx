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
};

/** How long a sticker floats before it's gone. */
const FLOAT_MS = 2600;

/** The sticker button and its tray. Picking one sends it and closes the tray. */
export function ReactionPicker({ send }: { send: (type: string, body: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', outside);
    wrap.current?.querySelector<HTMLButtonElement>('.sticker-tray button')?.focus();
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return (
    <div className="reaction-picker" ref={wrap}>
      <button
        ref={toggle}
        type="button"
        className="icon react-toggle"
        aria-label="Send a sticker"
        title="Send a sticker"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img src={cheering} alt="" width={30} height={30} />
      </button>
      {open && (
        <div className="sticker-tray" role="group" aria-label="Stickers">
          {STICKER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={STICKERS[id].label}
              title={STICKERS[id].label}
              onClick={() => {
                send(MSG_REACT, { sticker: id });
                setOpen(false);
              }}
            >
              <img src={STICKERS[id].art} alt="" width={64} height={64} />
            </button>
          ))}
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
