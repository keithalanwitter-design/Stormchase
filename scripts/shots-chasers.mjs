import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(opts);
  await p.goto(URL); await p.waitForSelector('.splash.gone', { timeout: 30000 });
  await p.evaluate(() => window.__stormchase.enter()); await p.waitForTimeout(6000);
  await p.click('.tabs >> text=Chasers');
  await p.waitForFunction(() => document.querySelector('[data-testid="chaser-reed-timmer"]')?.dataset.embedState !== 'loading', null, { timeout: 15000 });
  await p.waitForTimeout(1500);
  console.log(name, await p.getAttribute('[data-testid="chaser-reed-timmer"]', 'data-embed-state'));
  await p.screenshot({ path: `screenshots/v3-chaser-feed-${name}.png` });
}
await b.close();
