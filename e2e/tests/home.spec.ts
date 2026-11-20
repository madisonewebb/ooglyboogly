import { expect, test } from '@playwright/test';

test('loads the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Oogly Boogly');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oogly Boogly');
});

test('health reports ok', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.ok()).toBe(true);
  expect(await res.json()).toMatchObject({ status: 'ok', sha: 'e2e' });
});
