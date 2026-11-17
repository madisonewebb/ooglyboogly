/**
 * Post-deploy smoke test. Polls BASE_URL/health until it reports
 * EXPECTED_SHA, then joins the hello room over WebSocket and checks
 * that a ping comes back as a pong.
 *
 *   BASE_URL=https://rollhouse-staging.castillocurios.com EXPECTED_SHA=<sha> node smoke.ts
 *
 * Runs directly on Node (type stripping), so keep it to erasable TypeScript.
 */
import { Client } from '@colyseus/sdk';
import {
  HELLO_ROOM,
  MSG_PING,
  MSG_PONG,
  type HealthResponse,
} from '../packages/shared/src/protocol.ts';

const baseUrl = (process.env['BASE_URL'] ?? '').replace(/\/$/, '');
const expectedSha = process.env['EXPECTED_SHA'] ?? '';
const timeoutMs = Number(process.env['SMOKE_TIMEOUT_MS'] ?? 10 * 60_000);
const intervalMs = 10_000;

if (!baseUrl || !expectedSha) {
  console.error('BASE_URL and EXPECTED_SHA are required');
  process.exit(2);
}

async function waitForSha(): Promise<HealthResponse> {
  const deadline = Date.now() + timeoutMs;
  let last = 'no response yet';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const body = (await res.json()) as HealthResponse;
        if (body.sha === expectedSha) return body;
        last = `sha ${body.sha}`;
      } else {
        last = `HTTP ${res.status}`;
      }
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    console.log(`waiting for ${expectedSha.slice(0, 7)} at ${baseUrl}/health (${last})`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`timed out after ${timeoutMs / 1000}s waiting for sha ${expectedSha} (${last})`);
}

async function pingRoom(): Promise<void> {
  const client = new Client(baseUrl);
  const room = await client.joinOrCreate(HELLO_ROOM);
  const nonce = crypto.randomUUID();
  const pong = new Promise<unknown>((resolve, reject) => {
    room.onMessage(MSG_PONG, resolve);
    setTimeout(() => reject(new Error('no pong within 10s')), 10_000);
  });
  room.send(MSG_PING, { nonce });
  const reply = (await pong) as { nonce?: string };
  await room.leave();
  if (reply.nonce !== nonce) throw new Error(`unexpected pong: ${JSON.stringify(reply)}`);
}

try {
  const health = await waitForSha();
  console.log(`health ok: ${JSON.stringify(health)}`);
  await pingRoom();
  console.log('websocket ok: ping/pong through the hello room');
  process.exit(0);
} catch (err) {
  console.error(`smoke test failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
