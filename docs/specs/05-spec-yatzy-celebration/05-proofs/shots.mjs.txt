import { chromium } from '/home/madi/projects/ooglyboogly-wt/yatzy-celebration/e2e/node_modules/@playwright/test/index.mjs';
const OUT =
  '/home/madi/projects/ooglyboogly-wt/yatzy-celebration/docs/specs/05-spec-yatzy-celebration/05-proofs/shots';
const BASE = process.argv[2] ?? 'http://127.0.0.1:5199';
const browser = await chromium.launch();
const results = {};

async function run({ name, theme, scheme, reduced, at, w = 1280, h = 800, throttle = 1 }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  await ctx.addInitScript(
    ([theme, scheme]) => {
      try {
        localStorage.setItem('rollhouse:prefs', JSON.stringify({ theme, scheme, volume: 0 }));
      } catch {}
      window.__long = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__long.push(Math.round(e.duration));
      }).observe({ type: 'longtask', buffered: true });
    },
    [theme, scheme],
  );
  const page = await ctx.newPage();
  if (throttle > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await page.goto(`${BASE}/?pets&cosmetics=pet:toad`);
  await page.getByRole('button', { name: /^Yatzy/ }).waitFor();
  await page.waitForTimeout(1500); // let the page settle, so only the celebration is measured
  await page.evaluate(() => {
    window.__long.length = 0;
  });
  const t0 = Date.now();
  await page.keyboard.press('y');
  const shots = [];
  for (const ms of at) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const file = `${name}-${ms}ms.png`;
    await page.screenshot({ path: `${OUT}/${file}` });
    shots.push({ file, takenAtMs: Date.now() - t0 });
  }
  const info = await page.evaluate(() => ({
    pieces: document.querySelectorAll('.yatzy-piece').length,
    stars: document.querySelectorAll('.yatzy-star').length,
    status: document.querySelector('.yatzy-banner')?.getAttribute('role'),
    pointer: getComputedStyle(document.querySelector('.yatzy')).pointerEvents,
    text: document.querySelector('.yatzy-banner')?.textContent,
  }));
  // Wait until it clears itself, measuring how long it took from the click.
  await page.waitForSelector('[data-testid="yatzy-celebration"]', {
    state: 'detached',
    timeout: 6000,
  });
  const clearedAt = Date.now() - t0;
  const long = await page.evaluate(() => window.__long);
  results[name] = {
    shots,
    info,
    clearedAtMs: clearedAt,
    longTasksMs: long,
    worst: Math.max(0, ...long),
    throttle,
  };
  await ctx.close();
}

await run({ name: 'burst-dark', theme: 'dark', scheme: 'lavender', at: [450, 1100, 2000] });
await run({ name: 'burst-light', theme: 'light', scheme: 'lavender', at: [800] });
await run({ name: 'burst-moss-dark', theme: 'dark', scheme: 'moss', at: [800] });
await run({ name: 'burst-ocean-light', theme: 'light', scheme: 'ocean', at: [800] });
await run({ name: 'reduced-dark', theme: 'dark', scheme: 'lavender', reduced: true, at: [600] });
await run({ name: 'reduced-light', theme: 'light', scheme: 'lavender', reduced: true, at: [600] });
await run({ name: 'phone-dark', theme: 'dark', scheme: 'lavender', at: [800], w: 390, h: 800 });
await run({
  name: 'phone-reduced-light',
  theme: 'light',
  scheme: 'lavender',
  reduced: true,
  at: [600],
  w: 390,
  h: 800,
});
await run({ name: 'throttle4x', theme: 'dark', scheme: 'lavender', at: [800], throttle: 4 });
await run({
  name: 'throttle6x-reduced',
  theme: 'dark',
  scheme: 'lavender',
  reduced: true,
  at: [600],
  throttle: 6,
});
await browser.close();
console.log(JSON.stringify(results, null, 1));
