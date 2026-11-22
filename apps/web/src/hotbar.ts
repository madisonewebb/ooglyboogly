/**
 * Which stickers fill the hotbar, and in what order. The slots are the
 * player's favorites; with none saved they are every default sticker.
 * Saved on this device only.
 */
import { STICKER_IDS, type StickerId } from '@rollhouse/shared';

export const DEFAULT_SLOTS: readonly StickerId[] = STICKER_IDS;
/** Keys 1-9 reach the first nine slots. */
export const MAX_SLOTS = 9;

const KEY = 'rollhouse:hotbar';

const isId = (v: unknown): v is StickerId => (STICKER_IDS as readonly unknown[]).includes(v);

/** Drops unknown and repeated ids and caps the length. An empty bar is not allowed. */
export function normalizeSlots(value: unknown): StickerId[] {
  const out: StickerId[] = [];
  if (Array.isArray(value))
    for (const v of value) if (isId(v) && !out.includes(v) && out.length < MAX_SLOTS) out.push(v);
  return out.length > 0 ? out : [...DEFAULT_SLOTS];
}

export function loadSlots(): StickerId[] {
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeSlots(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeSlots(null);
  }
}

export function saveSlots(slots: readonly StickerId[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(slots));
  } catch {
    /* the bar still works until reload */
  }
}

/** Adds a sticker to the end of the bar, or removes it (the last one stays). */
export function toggleSlot(slots: readonly StickerId[], id: StickerId): StickerId[] {
  if (slots.includes(id)) return slots.length > 1 ? slots.filter((s) => s !== id) : [...slots];
  return slots.length < MAX_SLOTS ? [...slots, id] : [...slots];
}

/** Moves the slot at `from` by `by` places (negative is left). */
export function moveSlot(slots: readonly StickerId[], from: number, by: number): StickerId[] {
  const to = from + by;
  const next = [...slots];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** True when a key press belongs to typing, not to the hotbar. */
export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}
