import type { Application } from 'express';

/** Most reports a client may send per minute, across everyone (log-spam guard). */
export const CLIENT_LOG_PER_MINUTE = 30;
const MAX_FIELD = 500;

const clip = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_FIELD) : undefined);

/**
 * POST /api/client-log: the web client reports errors here (a failed join,
 * a dropped table), because inside Discord there's no console to read.
 * Needs express.json() on /api, which mountAuth installs.
 */
export function mountClientLog(app: Application, now: () => number = Date.now): void {
  let windowStart = now();
  let count = 0;
  app.post('/api/client-log', (req, res) => {
    if (now() - windowStart >= 60_000) {
      windowStart = now();
      count = 0;
    }
    if (++count > CLIENT_LOG_PER_MINUTE) return void res.status(429).end();
    const where = clip(req.body?.where);
    const message = clip(req.body?.message);
    if (!where || !message) return void res.status(400).end();
    const ua = clip(req.get('user-agent')) ?? '?';
    console.warn(`client error [${where}] ${message} (ua: ${ua})`);
    res.status(204).end();
  });
}
