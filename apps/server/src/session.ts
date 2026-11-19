import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionUser } from '@rollhouse/shared';

/** Long enough for an evening; a relaunch in Discord signs in again. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface Payload {
  u: SessionUser;
  exp: number;
}

const sign = (data: string, secret: string) =>
  createHmac('sha256', secret).update(data).digest('base64url');

/** A session is base64url(JSON payload) + "." + HMAC-SHA256 of it. */
export function signSession(user: SessionUser, secret: string, now = Date.now()): string {
  const payload: Payload = { u: user, exp: now + SESSION_TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data, secret)}`;
}

/** Returns the user, or null if the token is malformed, tampered with or expired. */
export function verifySession(
  token: unknown,
  secret: string,
  now = Date.now(),
): SessionUser | null {
  if (typeof token !== 'string') return null;
  const [data, mac, extra] = token.split('.');
  if (!data || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Payload;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    const u = payload.u;
    if (typeof u?.id !== 'string' || typeof u.name !== 'string') return null;
    if (u.avatar !== null && typeof u.avatar !== 'string') return null;
    return { id: u.id, name: u.name, avatar: u.avatar };
  } catch {
    return null;
  }
}
