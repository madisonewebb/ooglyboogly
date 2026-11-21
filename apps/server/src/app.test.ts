import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@colyseus/sdk';
import type { Server } from '@colyseus/core';
import { HELLO_ROOM, MSG_PING, MSG_PONG } from '@rollhouse/shared';
import { createGameServer } from './app';
import { loadConfig } from './config';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const config = loadConfig({ PORT: '1', GIT_SHA: 'abc1234', WEB_DIST: '/nonexistent' });
  server = createGameServer({ ...config, port: 0 }, { gracefullyShutdown: false });
  // Port 0 = any free port. Tests must not trap the runner's signals.
  server.options.gracefullyShutdown = false;
  await server.listen(0);
  const http = (server.transport as unknown as { server: HttpServer }).server;
  baseUrl = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe('server', () => {
  it('reports health with the deployed sha and version', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ status: 'ok', sha: 'abc1234', version: expect.any(String) });
    expect(body['version']).not.toBe('unknown');
  });

  it('echoes ping over a game room websocket', async () => {
    const client = new Client(baseUrl);
    const room = await client.joinOrCreate(HELLO_ROOM);
    const pong = new Promise((resolve) => room.onMessage(MSG_PONG, resolve));
    room.send(MSG_PING, { n: 42 });
    expect(await pong).toEqual({ n: 42 });
    await room.leave();
  });
});
