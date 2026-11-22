import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The deploy's smoke test (e2e/smoke.ts) imports protocol.ts straight on Node with type stripping,
 * and no build step. Node cannot follow an extensionless runtime import there, so protocol.ts may
 * only have type imports. A runtime import slipped in once and turned every deploy red. (This test lives in the server package, which has Node's types; the shared package does not.)
 */
describe('protocol.ts', () => {
  it('loads on bare Node with no build step, as the deploy smoke test does', () => {
    const file = fileURLToPath(
      new URL('../../../packages/shared/src/protocol.ts', import.meta.url),
    );
    const out = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(file)}); console.log(typeof m.MSG_PING, typeof m.HELLO_ROOM);`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    expect(out.trim()).toBe('string string');
  });
});
