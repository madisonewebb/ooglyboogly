import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_LOG_PER_MINUTE } from './clientLog';
import { startTestServer, type TestServer } from './test-server';

let t: TestServer | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
  vi.restoreAllMocks();
});

const report = (body: unknown) =>
  fetch(`${t!.baseUrl}/api/client-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/client-log', () => {
  it('logs a client error, clipped, and rate-limits', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    t = await startTestServer();
    expect((await report({ where: 'table join', message: 'x'.repeat(900) })).status).toBe(204);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[table join] ${'x'.repeat(500)} (`));
    expect((await report({ where: 'w' })).status).toBe(400);
    for (let i = 2; i < CLIENT_LOG_PER_MINUTE; i++) await report({ where: 'w', message: 'm' });
    expect((await report({ where: 'w', message: 'm' })).status).toBe(429);
  });
});
