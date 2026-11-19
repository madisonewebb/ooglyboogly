import { type FlavorId, isFlavor } from '@rollhouse/shared';

const KEY = 'rollhouse:flavor';

/** The flavor and backup this device last picked, sent when joining a table. */
export function loadFlavor(): { flavor?: FlavorId; backup?: FlavorId } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    return {
      ...(isFlavor(saved['flavor']) ? { flavor: saved['flavor'] } : {}),
      ...(isFlavor(saved['backup']) ? { backup: saved['backup'] } : {}),
    };
  } catch {
    return {};
  }
}

export function saveFlavor(flavor: FlavorId, backup: FlavorId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ flavor, backup }));
  } catch {
    /* it still applies at this table */
  }
}
