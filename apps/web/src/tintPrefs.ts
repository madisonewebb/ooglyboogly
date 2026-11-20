import { type TintId, isTint } from '@rollhouse/shared';

const KEY = 'rollhouse:tint';

/** The tint this device last picked, sent when joining a table. */
export function loadTint(): { tint?: TintId } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    return isTint(saved['tint']) ? { tint: saved['tint'] } : {};
  } catch {
    return {};
  }
}

export function saveTint(tint: TintId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ tint }));
  } catch {
    /* it still applies at this table */
  }
}
