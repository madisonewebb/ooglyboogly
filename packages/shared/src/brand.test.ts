import { describe, expect, it } from 'vitest';
import { BRAND_NAME } from './brand';

describe('brand', () => {
  it('has a name', () => {
    expect(BRAND_NAME).toBe('Oogly Boogly');
  });
});
