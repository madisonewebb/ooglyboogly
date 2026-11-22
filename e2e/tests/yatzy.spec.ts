import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { sitDown } from './helpers';

// The Yatzy celebration plays for every Yatzy roll, from the move log. The server
// rolls real random dice and has no dev roll override (and this spec may not add
// one), so a Yatzy cannot be forced in a real game here: the 1 in 1296 chance on
// a roll is never relied on. What this checks end to end is the part that can be
// checked deterministically: production has no bench, and an ordinary roll plays
// nothing. The firing rules themselves are unit tests (yatzyRolls.test.ts), and a
// real Yatzy was caught in a lab build run described in the spec 05 proofs.

test('the Yatzy bench and its preview exist only on the dev server and in lab builds', async ({
  page,
}) => {
  await page.goto('/?celebrations&yatzy=1&roller=Madi');
  // The bench page is not in the production build: this is the ordinary app.
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Yatzy/ })).toHaveCount(0);
  await expect(page.getByTestId('yatzy-celebration')).toHaveCount(0);
});

test('an ordinary roll on a real table plays no celebration, and the dice stay usable', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await sitDown(page, `e2e-${randomUUID()}`, 'Madi');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByTestId('yatzy-celebration')).toHaveCount(0);

  await page.getByRole('button', { name: /^Roll \(/ }).click();
  await expect(page.getByRole('button', { name: /^Die 1, rolling/ })).toHaveCount(0);
  const faces = await page
    .locator('button.die')
    .evaluateAll((dice) => dice.map((d) => /: (\d)/.exec(d.getAttribute('aria-label') ?? '')?.[1]));
  const yatzy = new Set(faces).size === 1;
  if (yatzy) {
    // The one-in-1296 case: then the celebration must show, and must not block the dice.
    await expect(page.getByTestId('yatzy-celebration')).toBeVisible();
    await expect(page.getByTestId('yatzy-celebration')).toHaveCSS('pointer-events', 'none');
  } else {
    await page.waitForTimeout(500);
    await expect(page.getByTestId('yatzy-celebration')).toHaveCount(0);
  }
});
