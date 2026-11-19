import type {
  ApiError,
  AppConfig,
  GuestResponse,
  SessionUser,
  TokenResponse,
} from '@rollhouse/shared';

export class ApiFailure extends Error {}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiFailure(err?.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const getConfig = () => call<AppConfig>('/api/config');
export const exchangeCode = (code: string) => call<TokenResponse>('/api/token', { code });
export const guestSignIn = (name: string) => call<GuestResponse>('/api/guest', { name });

/** Everything needed to sit down at a table. */
export interface Auth {
  session: string;
  user: SessionUser;
  instanceId: string;
  /** Base URL for Discord avatars: the /discord-cdn mapping inside Discord. */
  cdnBase: string;
  /** Set inside Discord. */
  discord: boolean;
}

/** Sends an error to the server log; inside Discord there's no console to read. */
export function reportError(where: string, message: string): void {
  void fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ where, message }),
  }).catch(() => {});
}
