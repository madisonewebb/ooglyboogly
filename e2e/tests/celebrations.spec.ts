import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { playTurn, sitDown } from './helpers';

// The Ghost Parade is drawn from what a seat has equipped. Nobody can
// equip anything until the shop (spec 02) is merged, so here the table is exactly
// today's: nothing is drawn, and the dev-only preview parameter does nothing.

test('with nothing equipped there is no parade, and the tray works as before', async ({ page }) => {
  test.setTimeout(90_000);
  await sitDown(page, `e2e-${randomUUID()}`, 'Madi');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('table')).toBeVisible();

  // A whole turn, rolling and scoring, still works, and still draws no parade.
  await playTurn(page);
  await expect(page.getByTestId('ghost-parade')).toHaveCount(0);
});

test('the preview parameter and the bench exist only on the dev server and in lab builds', async ({
  page,
}) => {
  test.setTimeout(90_000);
  // The bench page is not in the production build: this is the ordinary app.
  await page.goto('/?celebrations&cosmetics=celebration:ghostParade');
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ghost parade' })).toHaveCount(0);

  // And the override is ignored in a game.
  await page.getByLabel('Your name').fill('Madi');
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.getByRole('heading', { name: /At the table/ })).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByTestId('ghost-parade')).toHaveCount(0);
});
