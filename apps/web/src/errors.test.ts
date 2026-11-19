import { describe, expect, it } from 'vitest';
import { errorText, step } from './errors';

describe('errorText', () => {
  it('reads Discord SDK error objects', () => {
    expect(errorText({ code: 4002, message: 'Invalid redirect' })).toBe(
      'Invalid redirect (code 4002)',
    );
    expect(errorText(new Error('boom'))).toBe('boom');
    expect(errorText({ weird: true })).toBe('{"weird":true}');
    expect(errorText('plain')).toBe('plain');
  });

  it('names the step that failed', async () => {
    await expect(
      step('authorize', () => Promise.reject({ code: 1, message: 'no' })),
    ).rejects.toThrow('authorize: no (code 1)');
  });
});
