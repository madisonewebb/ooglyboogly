import { describe, expect, it } from 'vitest';
import { SESSION_TTL_MS, signSession, verifySession } from './session';

const SECRET = 'a'.repeat(32);
const user = { id: '123', name: 'Mema', avatar: 'abc' };

describe('sessions', () => {
  it('round-trips a user', () => {
    expect(verifySession(signSession(user, SECRET), SECRET)).toEqual(user);
  });

  it('rejects a token signed with another key', () => {
    expect(verifySession(signSession(user, SECRET), 'b'.repeat(32))).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const [, mac] = signSession(user, SECRET).split('.');
    const forged = Buffer.from(
      JSON.stringify({ u: { ...user, id: '999' }, exp: Date.now() + 1e6 }),
    ).toString('base64url');
    expect(verifySession(`${forged}.${mac}`, SECRET)).toBeNull();
  });

  it('expires', () => {
    const token = signSession(user, SECRET, 0);
    expect(verifySession(token, SECRET, SESSION_TTL_MS - 1)).toEqual(user);
    expect(verifySession(token, SECRET, SESSION_TTL_MS)).toBeNull();
  });

  it.each([undefined, 42, '', 'abc', 'a.b.c', 'a.b'])('rejects junk %s', (junk) => {
    expect(verifySession(junk, SECRET)).toBeNull();
  });
});
