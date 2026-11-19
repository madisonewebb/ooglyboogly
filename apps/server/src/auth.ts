import { randomUUID } from 'node:crypto';
import express, { type Application, type Response } from 'express';
import {
  type ApiError,
  type AppConfig,
  type GuestResponse,
  MAX_NAME_LENGTH,
  MIN_NAME_LENGTH,
  type SessionUser,
  type TokenResponse,
} from '@rollhouse/shared';
import type { Config } from './config';
import { signSession } from './session';

export const DISCORD_API = 'https://discord.com/api/v10';

export type FetchFn = typeof fetch;

/** Trims a display name to what the UI can show; null if nothing is left. */
export function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length >= MIN_NAME_LENGTH ? trimmed : null;
}

const fail = (res: Response, status: number, error: string) =>
  res.status(status).json({ error } satisfies ApiError);

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

/**
 * Sign-in routes. Inside Discord the client calls authorize() and sends the
 * code here; the server swaps it for an access token with the client secret
 * (which never leaves the server) and issues a signed Rollhouse session.
 */
export function mountAuth(app: Application, config: Config, fetchFn: FetchFn = fetch): void {
  app.use('/api', express.json({ limit: '4kb' }));

  app.get('/api/config', (_req, res) => {
    const body: AppConfig = {
      discordClientId: config.discordClientId,
      version: config.version,
      guestLogin: config.guestLogin,
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  app.post('/api/token', async (req, res) => {
    const { discordClientId: id, discordClientSecret: secret } = config;
    if (!id || !secret) return fail(res, 503, 'Discord sign-in is not configured');
    const code: unknown = req.body?.code;
    if (typeof code !== 'string' || code.length === 0 || code.length > 512) {
      return fail(res, 400, 'missing code');
    }
    try {
      const tokenRes = await fetchFn(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: id,
          client_secret: secret,
          grant_type: 'authorization_code',
          code,
        }),
      });
      if (!tokenRes.ok) {
        console.warn(`Discord token exchange failed: HTTP ${tokenRes.status}`);
        return fail(res, 401, 'Discord did not accept the sign-in');
      }
      const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
      if (!accessToken) return fail(res, 502, 'Discord sent no access token');

      const meRes = await fetchFn(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!meRes.ok) return fail(res, 502, 'could not read your Discord profile');
      const me = (await meRes.json()) as DiscordUser;
      const user: SessionUser = {
        id: me.id,
        name: cleanName(me.global_name) ?? cleanName(me.username) ?? 'Player',
        avatar: me.avatar ?? null,
      };
      const body: TokenResponse = {
        accessToken,
        session: signSession(user, config.sessionSecret),
        user,
      };
      return res.set('Cache-Control', 'no-store').json(body);
    } catch (err) {
      console.error('Discord sign-in failed', err);
      return fail(res, 502, 'could not reach Discord');
    }
  });

  if (config.guestLogin) {
    app.post('/api/guest', (req, res) => {
      const name = cleanName(req.body?.name);
      if (!name) return fail(res, 400, 'enter a name');
      const user: SessionUser = { id: `guest-${randomUUID()}`, name, avatar: null };
      const body: GuestResponse = { session: signSession(user, config.sessionSecret), user };
      return res.set('Cache-Control', 'no-store').json(body);
    });
  }
}
