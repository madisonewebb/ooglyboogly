import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', 'e2e/test-results/**', 'e2e/playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // noUncheckedIndexedAccess makes every index lookup possibly undefined;
      // `!` after a bounds check is clearer than a dead branch.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Fair dice: every die comes from crypto.randomInt on the server (see the plan).
    files: ['apps/server/**/*.{ts,tsx,js,mjs}', 'packages/rules/**/*.{ts,tsx,js,mjs}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Dice and game logic must use crypto.randomInt, never Math.random.',
        },
      ],
    },
  },
);
