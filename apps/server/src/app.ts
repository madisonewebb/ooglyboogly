import { existsSync } from 'node:fs';
import path from 'node:path';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { BRAND_NAME, HELLO_ROOM, type HealthResponse, TABLE_ROOM } from '@rollhouse/shared';
import { type FetchFn, mountAuth } from './auth';
import type { Config } from './config';
import { HelloRoom } from './rooms/HelloRoom';
import {
  createTableRoom,
  EMPTY_TIMEOUT_MS,
  RECONNECT_SECONDS,
  type TableConfig,
} from './rooms/TableRoom';

export interface ServerDeps {
  /** Replaced in tests to fake Discord. */
  fetch?: FetchFn;
  table?: Partial<TableConfig>;
}

export function createGameServer(config: Config, deps: ServerDeps = {}): Server {
  const server = new Server({
    greet: false,
    // Colyseus traps SIGINT/SIGTERM, disconnects every client and disposes
    // rooms before the process exits.
    gracefullyShutdown: true,
    transport: new WebSocketTransport({ pingInterval: 30_000, pingMaxRetries: 2 }),
    express: (app) => {
      app.disable('x-powered-by');

      app.get('/health', (_req, res) => {
        const body: HealthResponse = { status: 'ok', sha: config.gitSha, version: config.version };
        res.set('Cache-Control', 'no-store').json(body);
      });

      mountAuth(app, config, deps.fetch);

      if (existsSync(config.webDist)) {
        app.use(express.static(config.webDist, { index: 'index.html', maxAge: '1h' }));
        app.get('/{*splat}', (_req, res) => {
          res.sendFile(path.join(config.webDist, 'index.html'));
        });
      } else {
        app.get('/', (_req, res) => {
          res.type('text').send(`${BRAND_NAME}: web client not built (${config.webDist})`);
        });
      }
    },
  });

  server.define(HELLO_ROOM, HelloRoom);
  const TableRoom = createTableRoom({
    sessionSecret: config.sessionSecret,
    version: config.version,
    emptyTimeoutMs: EMPTY_TIMEOUT_MS,
    reconnectSeconds: RECONNECT_SECONDS,
    ...deps.table,
  });
  // One table per Discord Activity instance.
  server.define(TABLE_ROOM, TableRoom).filterBy(['instanceId']);
  return server;
}
