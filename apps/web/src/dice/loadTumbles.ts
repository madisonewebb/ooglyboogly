import tumblesUrl from './tumbles.bin?url';
import { decodeTumbles, type Tumbles } from './tumbleFormat';

let loading: Promise<Tumbles | null> | null = null;
let loaded: Tumbles | null = null;

/** Fetches the recorded tumbles once. The file is gzipped; until it arrives, rolls simply fade in. */
export function loadTumbles(): Promise<Tumbles | null> {
  loading ??= fetch(tumblesUrl)
    .then((r) => {
      if (!r.ok || !r.body) throw new Error(`tumbles: ${r.status}`);
      return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    })
    .then((buf) => (loaded = decodeTumbles(buf)))
    .catch((err: unknown) => {
      console.error('could not load the dice tumbles', err);
      return null;
    });
  return loading;
}

export const tumblesNow = () => loaded;
