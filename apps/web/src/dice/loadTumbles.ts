import tumblesUrl from './tumbles.bin?url';
import { decodeTumbles, type Tumbles } from './tumbleFormat';

let loading: Promise<Tumbles | null> | null = null;
let loaded: Tumbles | null = null;

/** Fetches the recorded tumbles once. Until they arrive, rolls simply fade in. */
export function loadTumbles(): Promise<Tumbles | null> {
  loading ??= fetch(tumblesUrl)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`tumbles: ${r.status}`))))
    .then((buf) => (loaded = decodeTumbles(buf)))
    .catch((err: unknown) => {
      console.error('could not load the dice tumbles', err);
      return null;
    });
  return loading;
}

export const tumblesNow = () => loaded;
