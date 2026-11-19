import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export interface Config {
  port: number;
  baseUrl: string;
  gitSha: string;
  version: string;
  webDist: string;
  dataDir: string;
  /** Null when Discord sign-in isn't configured (local dev). */
  discordClientId: string | null;
  discordClientSecret: string | null;
  /** HMAC key for session tokens. */
  sessionSecret: string;
  /** Enables POST /api/guest. Never on in staging or prod. */
  guestLogin: boolean;
}

declare const __APP_VERSION__: string | undefined;

function readVersion(): string {
  // Production bundles have the version baked in by build.mjs.
  if (typeof __APP_VERSION__ === 'string') return __APP_VERSION__;
  // Dev and tests: the repo root package.json, which release-please keeps in step.
  try {
    const url = new URL('../../../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env['PORT'] ?? 8080);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT: ${env['PORT']}`);
  return {
    port,
    baseUrl: env['BASE_URL'] ?? `http://localhost:${port}`,
    gitSha: env['GIT_SHA'] ?? 'dev',
    version: readVersion(),
    webDist: env['WEB_DIST'] ?? fileURLToPath(new URL('../../web/dist', import.meta.url)),
    dataDir: env['DATA_DIR'] ?? fileURLToPath(new URL('../../../data', import.meta.url)),
    discordClientId: env['DISCORD_CLIENT_ID'] || null,
    discordClientSecret: env['DISCORD_CLIENT_SECRET'] || null,
    sessionSecret: sessionSecret(env),
    guestLogin: env['GUEST_LOGIN'] === 'true',
  };
}

function sessionSecret(env: NodeJS.ProcessEnv): string {
  const secret = env['SESSION_SECRET'];
  if (secret) {
    if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
    return secret;
  }
  // Discord sign-in in a deployed environment needs a stable key, or every
  // restart would sign everyone out.
  if (env['DISCORD_CLIENT_ID'])
    throw new Error('SESSION_SECRET is required with DISCORD_CLIENT_ID');
  return randomBytes(32).toString('base64url');
}
