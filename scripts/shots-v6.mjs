import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const settle = async (p, ms) => { await p.waitForFunction(() => window.__stormchase?.map && !window.__stormchase.map.isMoving(), null, { timeout: 30000 }); await p.waitForTimeout(ms); };
const D = { viewport: { width: 1440, height: 900 } }, M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
for (const [name, opts] of [['desktop', D], ['mobile', M]]) {
  const p = await b.newPage(opts);
  await p.goto(URL); await p.waitForSelector('.splash.gone', { timeout: 30000 }); await p.waitForTimeout(3000); await settle(p, 5000);
  await p.screenshot({ path: `screenshots/v6-live-landing-${name}.png` });
  await p.click('[data-testid="try-demo"]'); await p.click('[data-testid="tour-next"]'); await p.click('[data-testid="tour-next"]');
  await p.waitForTimeout(800); await settle(p, 3500);
  await p.screenshot({ path: `screenshots/v6-demo-step3-${name}.png` });
  await p.click('.tour-exit'); await p.waitForTimeout(500);
  await p.click('[data-testid="how-link"]'); await p.waitForSelector('[data-testid="faq"]');
  await p.locator('[data-testid="faq"]').scrollIntoViewIfNeeded(); await p.click('[data-testid="faq"] details:nth-child(6) summary'); await p.waitForTimeout(500);
  await p.screenshot({ path: `screenshots/v6-faq-${name}.png` });
}
await b.close(); console.log('ok');
