import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig, TokenResponse } from '@rollhouse/shared';
import { cleanName, DISCORD_API } from './auth';
import { verifySession } from './session';
import { startTestServer, TEST_SECRET, type TestServer } from './test-server';

let t: TestServer | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
});

const DISCORD_ENV = { DISCORD_CLIENT_ID: 'cid', DISCORD_CLIENT_SECRET: 'shh' };

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** A fake Discord that accepts the code "good". */
function fakeDiscord() {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u === `${DISCORD_API}/oauth2/token`) {
      const form = new URLSearchParams(String(init?.body));
      const ok =
        form.get('code') === 'good' &&
        form.get('client_id') === 'cid' &&
        form.get('client_secret') === 'shh' &&
        form.get('grant_type') === 'authorization_code';
      return ok
        ? Response.json({ access_token: 'at-1', token_type: 'Bearer' })
        : Response.json({ error: 'invalid_grant' }, { status: 400 });
    }
    if (u === `${DISCORD_API}/users/@me`) {
      const authed = new Headers(init?.headers).get('Authorization') === 'Bearer at-1';
      return authed
        ? Response.json({ id: '42', username: 'mema_k', global_name: '  Mema  ', avatar: 'h1' })
        : new Response(null, { status: 401 });
    }
    return new Response(null, { status: 404 });
  });
}

describe('GET /api/config', () => {
  it('describes the environment', async () => {
    t = await startTestServer({ ...DISCORD_ENV });
    const body = (await (await fetch(`${t.baseUrl}/api/config`)).json()) as AppConfig;
    expect(body).toEqual({
      discordClientId: 'cid',
      version: expect.any(String),
      guestLogin: false,
    });
  });
});

describe('POST /api/token', () => {
  it('swaps a Discord code for an access token and a session', async () => {
    const discord = fakeDiscord();
    t = await startTestServer({ ...DISCORD_ENV }, { fetch: discord as typeof fetch });
    const res = await post(`${t.baseUrl}/api/token`, { code: 'good' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as TokenResponse;
    const user = { id: '42', name: 'Mema', avatar: 'h1' };
    expect(body.accessToken).toBe('at-1');
    expect(body.user).toEqual(user);
    expect(verifySession(body.session, TEST_SECRET)).toEqual(user);
  });

  it('rejects a code Discord refuses', async () => {
    t = await startTestServer({ ...DISCORD_ENV }, { fetch: fakeDiscord() as typeof fetch });
    expect((await post(`${t.baseUrl}/api/token`, { code: 'bad' })).status).toBe(401);
    expect((await post(`${t.baseUrl}/api/token`, {})).status).toBe(400);
  });

  it('is unavailable without Discord credentials', async () => {
    t = await startTestServer();
    expect((await post(`${t.baseUrl}/api/token`, { code: 'good' })).status).toBe(503);
  });

  it('reports Discord being unreachable', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    t = await startTestServer({ ...DISCORD_ENV }, { fetch: down as typeof fetch });
    expect((await post(`${t.baseUrl}/api/token`, { code: 'good' })).status).toBe(502);
  });
});

describe('POST /api/guest', () => {
  it('is off unless GUEST_LOGIN=true', async () => {
    t = await startTestServer();
    expect((await post(`${t.baseUrl}/api/guest`, { name: 'Madi' })).status).toBe(404);
  });

  it('issues a guest session', async () => {
    t = await startTestServer({ GUEST_LOGIN: 'true' });
    const body = (await (await post(`${t.baseUrl}/api/guest`, { name: 'Madi' })).json()) as {
      session: string;
    };
    expect(verifySession(body.session, TEST_SECRET)).toMatchObject({
      id: expect.stringMatching(/^guest-/),
      name: 'Madi',
    });
    expect((await post(`${t.baseUrl}/api/guest`, { name: '   ' })).status).toBe(400);
  });
});

describe('cleanName', () => {
  it('collapses whitespace and trims to 32 characters', () => {
    expect(cleanName('  Big   Mema ')).toBe('Big Mema');
    expect(cleanName('x'.repeat(40))).toHaveLength(32);
    expect(cleanName('')).toBeNull();
    expect(cleanName(null)).toBeNull();
  });
});
