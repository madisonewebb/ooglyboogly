import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { playTurn, sitDown } from './helpers';

// Pets and the Ghost Parade are drawn from what a seat has equipped. Nobody can
// equip anything until the shop (spec 02) is merged, so here the table is exactly
// today's: nothing is drawn, and the dev-only preview parameter does nothing.

test('with nothing equipped there is no pet and no parade, and the tray works as before', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await sitDown(page, `e2e-${randomUUID()}`, 'Madi');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('table')).toBeVisible();

  // The layer is there to host a pet, and is empty and out of the way.
  const layer = page.getByTestId('pet-layer');
  await expect(layer).toBeAttached();
  await expect(layer).toHaveAttribute('aria-hidden', 'true');
  await expect(layer.locator('.pet')).toHaveCount(0);

  // A whole turn, rolling and scoring, still works, and still draws no pet.
  await playTurn(page);
  await expect(layer.locator('.pet')).toHaveCount(0);
  await expect(page.getByTestId('ghost-parade')).toHaveCount(0);
});

test('the preview parameter and the bench exist only on the dev server and in lab builds', async ({
  page,
}) => {
  test.setTimeout(90_000);
  // The bench page is not in the production build: this is the ordinary app.
  await page.goto('/?pets&cosmetics=pet:toad,celebration:ghostParade');
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ghost parade' })).toHaveCount(0);

  // And the override is ignored in a game.
  await page.getByLabel('Your name').fill('Madi');
  await page.getByRole('button', { name: 'Sit down' }).click();
  await expect(page.getByRole('heading', { name: /At the table/ })).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('.pet')).toHaveCount(0);
});
