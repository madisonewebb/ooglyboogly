import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { type BrowserContextOptions, expect, type Page, test } from '@playwright/test';
import { playTurn, sitDown } from './helpers';

/** "+6 coins" → 6, read from the standing row with this name. */
async function coinsFor(page: Page, name: string): Promise<number> {
  const line = page.locator('.standing').filter({ hasText: name }).getByTestId('coin-line');
  await expect(line).toContainText(/\+\d+ coins?/);
  const text = (await line.textContent()) ?? '';
  return Number(/\+(\d+) coin/.exec(text)![1]);
}

test('a finished game shows each player what they earned, and their new balance', async ({
  page,
  browser,
}, info) => {
  // 26 animated rolls and two browsers drawing them.
  test.setTimeout(180_000);
  const table = `e2e-${randomUUID()}`;
  // Mom's browser asks for reduced motion, so one game covers both paths.
  const other = await browser.newContext({
    ...(info.project.use as BrowserContextOptions),
    reducedMotion: 'reduce',
  });
  const mom = await other.newPage();

  await sitDown(page, table, 'Madi');
  await sitDown(mom, table, 'Mom');
  await expect(page.getByText('Mom', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(mom.getByRole('table')).toBeVisible();

  for (let turn = 0; turn < 13; turn++) {
    await playTurn(page);
    await playTurn(mom, turn === 12);
  }

  for (const p of [page, mom]) {
    // The results come first; the coins follow once the server has paid.
    await expect(p.getByTestId('winner')).toContainText(/wins!|tie/);
    await expect(p.getByTestId('coin-line')).toHaveCount(2);
  }

  // Both players see the same two amounts; a 1-card game pays 3 for finishing
  // and the win bonus (3, or split on a tie) on top.
  const madi = await coinsFor(page, 'Madi');
  const momCoins = await coinsFor(page, 'Mom');
  expect(await coinsFor(mom, 'Madi')).toBe(madi);
  expect(await coinsFor(mom, 'Mom')).toBe(momCoins);
  expect(madi).toBeGreaterThanOrEqual(3);
  expect(momCoins).toBeGreaterThanOrEqual(3);

  // It is these guests' first game, so each balance is just what they earned.
  await expect(page.getByTestId('coin-balance')).toContainText(`You now have ${madi}`);
  await expect(mom.getByTestId('coin-balance')).toContainText(`You now have ${momCoins}`);

  // With reduced motion the coin line is simply there, with no fade left to wait for.
  await expect(mom.getByTestId('coin-line').first()).toHaveCSS('opacity', '1');

  // Let the entrance animations finish so the picture shows the settled screen.
  for (const row of await page.locator('.standing').all())
    await expect(row).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('coin-balance')).toHaveCSS('opacity', '1');
  if (process.env['COIN_SCREENSHOT']) await page.waitForTimeout(2500);
  const shot = await page.screenshot({ fullPage: true });
  await info.attach('results-with-coins', { body: shot, contentType: 'image/png' });
  // Set COIN_SCREENSHOT to keep a copy, for the spec's proof files.
  if (process.env['COIN_SCREENSHOT']) await writeFile(process.env['COIN_SCREENSHOT'], shot);
  await other.close();
});
