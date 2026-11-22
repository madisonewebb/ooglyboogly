import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, type Page, test } from '@playwright/test';
import { playTurn, sitDown } from './helpers';

/** The test server's own database (see playwright.config.ts). */
const DB = path.join(
  tmpdir(),
  `rollhouse-e2e-data-${Number(process.env['E2E_PORT'] ?? 8090)}`,
  'rollhouse.db',
);

/** The guest id this browser signed in with. */
async function myId(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (JSON.parse(sessionStorage.getItem('rollhouse:guest')!) as { user: { id: string } }).user.id,
  );
}

const balanceOf = async (page: Page, id: 'lobby-balance' | 'shop-balance' | 'nav-balance') =>
  Number(((await page.getByTestId(id).textContent()) ?? '').match(/\d+/)![0]);

test('earn coins, buy a skin in the shop, wear it, and see it at the table', async ({
  page,
  browser,
}) => {
  // 26 animated rolls, then a second table.
  test.setTimeout(360_000);
  const shots = process.env['SHOP_SHOTS'];
  const shoot = async (name: string) => {
    if (shots)
      await writeFile(path.join(shots, `${name}.png`), await page.screenshot({ fullPage: true }));
  };

  // 1. Earn: two guests finish a 1-card game, which pays a few coins each.
  const first = `e2e-${randomUUID()}`;
  const other = await browser.newContext();
  const mom = await other.newPage();
  await sitDown(page, first, 'Madi');
  await sitDown(mom, first, 'Mom');
  await expect(page.getByText('Mom', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(mom.getByRole('table')).toBeVisible();
  for (let turn = 0; turn < 13; turn++) {
    await playTurn(page);
    await playTurn(mom, turn === 12);
  }
  await expect(page.getByTestId('coin-balance')).toContainText('You now have');
  const earned = Number(
    ((await page.getByTestId('coin-balance').textContent()) ?? '').match(/\d+/)![0],
  );
  expect(earned).toBeGreaterThanOrEqual(3);
  expect(earned).toBeLessThan(40);
  await other.close();

  // 2. The next table: the lobby shows exactly what was earned, and the shop too.
  await page.goto(`/?table=e2e-${randomUUID()}`);
  await expect(page.getByTestId('lobby-balance')).toBeVisible();
  expect(await balanceOf(page, 'lobby-balance')).toBe(earned);
  // The band shows the same balance, in the lobby and in the shop.
  expect(await balanceOf(page, 'nav-balance')).toBe(earned);
  await page.getByRole('button', { name: 'Open the shop' }).click();
  expect(await balanceOf(page, 'shop-balance')).toBe(earned);
  expect(await balanceOf(page, 'nav-balance')).toBe(earned);

  // Sticker packs are switched off for now, so the shop sells gear only.
  await expect(page.getByRole('heading', { name: 'Sticker packs' })).toHaveCount(0);
  await expect(page.getByTestId('card-cauldronCrew')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Dice skins' })).toBeVisible();

  // Not enough yet: the skin says how short, and cannot be bought.
  const bone = page.getByTestId('card-bone');
  await expect(page.getByTestId('state-bone')).toHaveText(`${40 - earned} coins short`);
  await expect(bone.getByRole('button', { name: /^Buy Bone/ })).toBeDisabled();
  await expect(bone).toContainText('Ivory dice with ink-black pips.');

  // 3. Pin it as a goal, and watch the bar in the lobby.
  await bone.getByRole('button', { name: 'Pin as goal' }).click();
  await expect(bone.getByRole('button', { name: 'Unpin goal' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the table' }).click();
  await expect(page.getByTestId('goal')).toContainText('Bone');
  await expect(page.getByTestId('goal')).toContainText(`${earned} of 40 coins`);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(earned));
  await shoot('lobby-goal');

  // 4. Top up. A 1-card game pays too little for a 40-coin skin, so the test adds coins
  //    straight to its own temporary database. Nothing else about the purchase is faked.
  const id = await myId(page);
  const db = new DatabaseSync(DB);
  db.prepare('UPDATE wallets SET coins = coins + 100 WHERE user_id = ?').run(id);
  db.close();
  await page.reload();
  expect(await balanceOf(page, 'lobby-balance')).toBe(earned + 100);
  await page.getByRole('button', { name: 'Open the shop' }).click();
  await expect(page.getByTestId('state-bone')).toHaveText('You can afford this, your goal');
  await shoot('shop');

  // 5. Buy takes two taps. "Not now" spends nothing.
  await bone.getByRole('button', { name: /^Buy Bone/ }).click();
  await expect(bone).toContainText('Spend 40 coins on Bone?');
  await bone.getByRole('button', { name: 'Not now' }).click();
  expect(await balanceOf(page, 'shop-balance')).toBe(earned + 100);
  await bone.getByRole('button', { name: /^Buy Bone/ }).click();
  await bone.getByRole('button', { name: 'Yes, buy it' }).click();
  await expect(page.getByTestId('state-bone')).toHaveText('Owned');
  expect(await balanceOf(page, 'shop-balance')).toBe(earned + 60);
  // The band drops with the purchase, without a reload.
  expect(await balanceOf(page, 'nav-balance')).toBe(earned + 60);
  await expect(bone.getByRole('button', { name: /^Buy/ })).toHaveCount(0);

  // The goal was bought, so the bar is gone. It stays bought after a reload.
  await page.reload();
  await expect(page.getByTestId('goal')).toHaveCount(0);
  expect(await balanceOf(page, 'lobby-balance')).toBe(earned + 60);

  // 6. Wear it: the shop says so, and the lobby shows the look next to the player's name.
  await page.getByRole('button', { name: 'Open the shop' }).click();
  await bone.getByRole('button', { name: 'Wear it' }).click();
  await expect(page.getByTestId('state-bone')).toHaveText('Owned, wearing it');
  await expect(bone.getByRole('button', { name: 'Take off' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the table' }).click();
  await expect(page.locator('.seat-look')).toContainText('Bone');
  await shoot('lobby-wearing');

  // It is kept after a reload, and taking it off clears it.
  await page.reload();
  await expect(page.locator('.seat-look')).toContainText('Bone');
  await page.getByRole('button', { name: 'Open the shop' }).click();
  await expect(page.getByTestId('state-bone')).toHaveText('Owned, wearing it');
  await bone.getByRole('button', { name: 'Take off' }).click();
  await expect(page.getByTestId('state-bone')).toHaveText('Owned');
  await page.getByRole('button', { name: 'Back to the table' }).click();
  await expect(page.locator('.seat-look')).toHaveCount(0);
});
