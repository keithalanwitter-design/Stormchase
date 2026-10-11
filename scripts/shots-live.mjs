import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const settle = async (p, ms) => { await p.waitForFunction(() => !window.__stormchase.map.isMoving(), null, { timeout: 30000 }); await p.waitForTimeout(ms); };
const views = [['desktop', { viewport: { width: 1440, height: 900 } }, 5.6], ['mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 4.9]];
for (const [name, opts, zoom] of views) {
  const p = await b.newPage(opts);
  await p.goto(URL); await p.waitForSelector('.splash.gone', { timeout: 30000 });
  await p.evaluate(() => window.__stormchase.enter()); await settle(p, 800);
  await p.waitForFunction(() => !/Loading radar/.test(document.querySelector('[data-testid="radar-bar"]')?.textContent ?? ''), null, { timeout: 15000 });
  await p.click('[aria-label="Pause radar loop"]');
  await p.evaluate(() => { const s = document.querySelector('[aria-label="Radar frame"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, s.max); s.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.evaluate((z) => window.__stormchase.map.jumpTo({ center: [-84.2, 33.2], zoom: z }), zoom);
  await settle(p, 6000);
  await p.screenshot({ path: `screenshots/v5-live-${name}.png` });
  await p.click('[data-testid="live-chip"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: `screenshots/v5-live-${name}-summary.png` });
}
await b.close(); console.log('ok');
