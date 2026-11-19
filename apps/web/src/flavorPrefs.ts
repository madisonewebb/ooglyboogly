import { type FlavorId, isFlavor } from '@rollhouse/shared';

const KEY = 'rollhouse:flavor';

/** The flavor this device last picked, sent when joining a table. */
export function loadFlavor(): { flavor?: FlavorId } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    return isFlavor(saved['flavor']) ? { flavor: saved['flavor'] } : {};
  } catch {
    return {};
  }
}

export function saveFlavor(flavor: FlavorId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ flavor }));
  } catch {
    /* it still applies at this table */
  }
}
