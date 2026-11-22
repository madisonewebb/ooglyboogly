import { chromium } from '/home/madi/projects/ooglyboogly-wt/yatzy-celebration/e2e/node_modules/@playwright/test/index.mjs';
const BASE = process.argv[2] ?? 'http://127.0.0.1:5199';
const b = await chromium.launch();
async function go({ label, press, reduced, throttle }) {
  const c = await b.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  await c.addInitScript(() => {
    try {
      localStorage.setItem('rollhouse:prefs', JSON.stringify({ theme: 'dark', volume: 0 }));
    } catch {}
    window.__long = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__long.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: 'longtask', buffered: true });
  });
  const p = await c.newPage();
  if (throttle > 1)
    await (await c.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.goto(`${BASE}/?pets&cosmetics=pet:toad`);
  await p.getByRole('button', { name: /^Yatzy/ }).waitFor();
  await p.waitForTimeout(3000);
  const t = await p.evaluate(() => {
    window.__long.length = 0;
    return performance.now();
  });
  if (press) await p.keyboard.press('y');
  await p.waitForTimeout(4500);
  const long = await p.evaluate((t) => window.__long.map(([s, d]) => [s - t, d]), t);
  const gone = await p.locator('.yatzy').count();
  console.log(
    label,
    'longtasks [startMs-after-press, durMs]:',
    JSON.stringify(long),
    'worst',
    Math.max(0, ...long.map((x) => x[1])),
    'celebration cleared:',
    gone === 0,
  );
  await c.close();
}
for (const throttle of [1, 4]) {
  await go({ label: `baseline(no celebration) x${throttle}`, press: false, throttle });
  await go({ label: `burst x${throttle}`, press: true, throttle });
  await go({ label: `reduced x${throttle}`, press: true, reduced: true, throttle });
}
await b.close();
