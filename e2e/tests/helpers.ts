import { expect, type Page } from '@playwright/test';

/**
 * Signs in as a guest at a shared table and waits for the lobby. Fast rolls is
 * on, as a player can set it: a whole game is 26 animated rolls, and this
 * still plays every one of them, at half length.
 */
export async function sitDown(page: Page, table: string, name: string) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rollhouse:prefs', JSON.stringify({ fastRolls: true }));
    } catch {
      // about:blank has no storage; the real page sets it.
    }
  });
  await page.goto(`/?table=${table}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.getByRole('heading', { name: /At the table/ })).toBeVisible();
}

/** Rolls once and writes the dice in the first box the rules allow. */
export async function playTurn(page: Page, endsGame = false) {
  // Your own pad: in Take turns the pad follows whoever is up, so pick it first.
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  const filled = page.getByRole('region', { name: /score pad/ }).locator('td.filled');
  const before = await filled.count();
  await page.getByRole('button', { name: /^Roll \(/ }).click();
  // Previews wait for the dice to land.
  await expect(page.getByRole('button', { name: /^Die 1, rolling/ })).toHaveCount(0);
  const box = page.locator('button.preview:not([disabled])').first();
  const value = await box.textContent();
  await box.click();
  await page.getByRole('button', { name: /^Write it in/ }).click();
  if (value === '0') {
    await expect(page.getByText(/^Put 0 in/)).toBeVisible();
    await page.getByRole('button', { name: 'Yes, put 0' }).click();
  }
  // The last score of the game swaps the pad for the results.
  if (endsGame) await expect(page.getByTestId('winner')).toBeVisible();
  else {
    await page.getByRole('tab', { name: 'You', exact: true }).click();
    await expect(filled).toHaveCount(before + 1);
  }
}
