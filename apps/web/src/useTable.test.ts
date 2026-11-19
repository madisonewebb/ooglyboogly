import { afterEach, describe, expect, it, vi } from 'vitest';
import { tableClient } from './useTable';

afterEach(() => vi.unstubAllGlobals());

describe('tableClient', () => {
  it('keeps URLs same-origin inside Discord (no /.proxy/colyseus rewrite)', () => {
    const origin = 'https://1572818186158481522.discordsays.com';
    vi.stubGlobal('window', { location: new URL(`${origin}/?frame_id=x`) });
    const client = tableClient(origin) as unknown as {
      getHttpEndpoint(path: string): string;
      buildEndpoint(seat: { processId: string; roomId: string; sessionId: string }): string;
    };
    expect(client.getHttpEndpoint('matchmake/joinOrCreate/table')).toBe(
      `${origin}/matchmake/joinOrCreate/table`,
    );
    const ws = client.buildEndpoint({ processId: 'p', roomId: 'r', sessionId: 's' });
    expect(ws.startsWith('wss://1572818186158481522.discordsays.com/p/r?')).toBe(true);
  });
});
