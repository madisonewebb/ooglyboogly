import { expect, type Page, test } from '@playwright/test';

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

/** Captures the die a few times and returns how many different pictures it made. */
async function distinctDieFrames(page: Page): Promise<number> {
  const die = page.locator('.brand-die').first();
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    seen.add((await die.screenshot()).toString('base64'));
    await page.waitForTimeout(300);
  }
  return seen.size;
}

// Headless Chromium draws WebGL in software, the case that used to show a flat, still picture.
test('the die on the sign-in screen is 3D and turns, even without a GPU', async ({ page }) => {
  await page.goto('/');
  // The 3D code loads lazily, which can be slow on a busy machine.
  await expect(page.locator('.brand-die canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.brand-flat')).toHaveCount(0);
  expect(await distinctDieFrames(page)).toBeGreaterThan(1);
});

test('the die holds still when the device asks for reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  // The 3D code loads lazily, which can be slow on a busy machine.
  await expect(page.locator('.brand-die canvas')).toBeVisible({ timeout: 30_000 });
  expect(await distinctDieFrames(page)).toBe(1);
  await context.close();
});

// Headless Chromium draws WebGL in software. Setting up image-based lighting there used to freeze
// the page for about 4 seconds at load, which made the first click or join hang.
test('starting the 3D die does not freeze the page, even without a GPU', async ({ page }) => {
  type Probe = { __longest: number };
  await page.addInitScript(() => {
    const probe = window as unknown as Probe;
    probe.__longest = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        probe.__longest = Math.max(probe.__longest, entry.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto('/');
  await expect(page.locator('.brand-die canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(5000);
  const longest = await page.evaluate(() => (window as unknown as Probe).__longest);
  expect(longest).toBeLessThan(1500);
});
