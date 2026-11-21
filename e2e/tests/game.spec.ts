import { randomUUID } from 'node:crypto';
import { type BrowserContextOptions, expect, type Page, test } from '@playwright/test';

/**
 * Signs in as a guest at a shared table and waits for the lobby. Fast rolls is
 * on, as a player can set it: a whole game is 26 animated rolls, and this
 * still plays every one of them, at half length.
 */
async function sitDown(page: Page, table: string, name: string) {
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
async function playTurn(page: Page, endsGame = false) {
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

for (const style of ['Take turns', 'Everyone at once'] as const) {
  test(`two players finish a 1-card game (${style})`, async ({ page, browser }, info) => {
    // 26 animated rolls and two browsers drawing them.
    test.setTimeout(180_000);
    const table = `e2e-${randomUUID()}`;
    const other = await browser.newContext(info.project.use as BrowserContextOptions);
    const mom = await other.newPage();

    await sitDown(page, table, 'Madi');
    await sitDown(mom, table, 'Mom');
    await expect(page.getByText('Mom', { exact: true })).toBeVisible();
    await expect(mom.getByText(/Waiting for Madi to start/)).toBeVisible();

    // Tints are unique at the table: Mom can't take Madi's.
    await expect(mom.getByRole('button', { name: /^Rose \(taken by Madi\)/ })).toBeDisabled();
    await mom.getByRole('button', { name: 'Heather', exact: true }).first().click();
    await expect(
      page.getByRole('button', { name: /^Heather \(taken by Mom\)/ }).first(),
    ).toBeDisabled();

    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: style }).click();
    await expect(page.getByRole('button', { name: style })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(mom.getByRole('table')).toBeVisible();

    // One tab per player on the pad; the pad says whose it is.
    const tabs = page.getByRole('tablist', { name: 'Score pads' });
    await expect(tabs.getByRole('tab')).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'You', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('heading', { name: 'Your pad' })).toBeVisible();

    // Arrow keys move between pads. On your go, someone else's pad is look-only.
    await page.getByRole('tab', { name: 'You', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    const momTab = page.getByRole('tab', { name: 'Mom', exact: true });
    await expect(momTab).toBeFocused();
    await expect(momTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Mom' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "Mom's pad" })).toBeVisible();
    await expect(page.getByText('You can only write on your own pad.')).toBeVisible();
    await page.getByRole('button', { name: 'Back to your pad' }).click();
    await expect(page.getByRole('heading', { name: 'Your pad' })).toBeVisible();

    if (style === 'Take turns') {
      // A player can't roll out of turn.
      await expect(mom.getByRole('button', { name: /^Roll \(/ })).toHaveCount(0);
      // Mom isn't up, so looking at Madi's pad is just looking.
      await mom.getByRole('tab', { name: 'Madi', exact: true }).click();
      await expect(mom.getByText('You can only write on your own pad.')).toHaveCount(0);
      for (let turn = 0; turn < 13; turn++) {
        await playTurn(page);
        await playTurn(mom, turn === 12);
      }
    } else {
      for (let turn = 0; turn < 13; turn++) await playTurn(page);
      await expect(page.getByText(/You're done/)).toBeVisible();
      for (let turn = 0; turn < 13; turn++) await playTurn(mom, turn === 12);
    }

    for (const p of [page, mom]) await expect(p.getByTestId('winner')).toContainText(/wins!|tie/);
    await other.close();
  });
}

test('a player who reloads keeps their seat', async ({ page }) => {
  const table = `e2e-${randomUUID()}`;
  await sitDown(page, table, 'Madi');
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: /^Roll \(/ }).click();
  await expect(page.getByRole('button', { name: 'Roll (2 left)' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Roll (2 left)' })).toBeVisible();
});
