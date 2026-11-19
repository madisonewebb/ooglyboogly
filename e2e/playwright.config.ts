import { defineConfig, devices } from '@playwright/test';

const PORT = 8090;

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Tests run against the production build (task build), served by the real server.
  webServer: {
    command: 'node ../apps/server/dist/index.mjs',
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: !process.env['CI'],
    env: { PORT: String(PORT), GIT_SHA: 'e2e', WEB_DIST: '../apps/web/dist', GUEST_LOGIN: 'true' },
  },
});
