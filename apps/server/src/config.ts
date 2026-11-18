import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Config {
  port: number;
  baseUrl: string;
  gitSha: string;
  version: string;
  webDist: string;
  dataDir: string;
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
  };
}
