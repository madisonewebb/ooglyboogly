import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import type { Server } from '@colyseus/core';
import { createGameServer, type ServerDeps } from './app';
import { loadConfig } from './config';

export const TEST_SECRET = 'test-secret-that-is-at-least-32-characters';

export interface TestServer {
  server: Server;
  baseUrl: string;
  close(): Promise<void>;
}

/** Starts a real game server on a free port. */
export async function startTestServer(
  env: NodeJS.ProcessEnv = {},
  deps: ServerDeps = {},
): Promise<TestServer> {
  const config = loadConfig({
    PORT: '1',
    GIT_SHA: 'abc1234',
    WEB_DIST: '/nonexistent',
    SESSION_SECRET: TEST_SECRET,
    ...env,
  });
  const server = createGameServer({ ...config, port: 0 }, deps);
  // Tests must not trap the runner's signals.
  server.options.gracefullyShutdown = false;
  await server.listen(0);
  const http = (server.transport as unknown as { server: HttpServer }).server;
  const baseUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  return { server, baseUrl, close: () => server.gracefullyShutdown(false) };
}
