import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{apps,packages}/*/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['packages/rules/src/**'],
      exclude: ['**/*.test.ts', '**/test-helpers.ts'],
      // A scoring bug ruins a game, so the rules engine keeps full coverage.
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
