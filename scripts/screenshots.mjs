import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args });
const idle = (p, ms = 4000) => p.waitForFunction(() => window.__stormchase?.map && !window.__stormchase.map.isMoving(), null, { timeout: 30000 }).then(() => p.waitForTimeout(ms));

const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL); await idle(d, 6000);
await d.screenshot({ path: 'screenshots/01-globe-landing.png' });
await d.click('text=Enter Forecast Center'); await d.waitForTimeout(500); await idle(d, 1500);
await d.evaluate(() => window.__stormchase.select('hs-ozark')); await d.waitForTimeout(800); await idle(d, 4000);
await d.screenshot({ path: 'screenshots/02-regional-hotspot-card.png' });
await d.click('text=SPC'); await d.waitForTimeout(5000);
await d.screenshot({ path: 'screenshots/03-spc-comparison.png' });

const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(URL); await idle(m, 3000);
await m.click('text=Enter Forecast Center'); await m.waitForTimeout(500); await idle(m, 1000);
await m.evaluate(() => window.__stormchase.select('hs-ilmo')); await m.waitForTimeout(800); await idle(m, 3000);
await m.screenshot({ path: 'screenshots/04-mobile-hotspot.png' });
await browser.close();
console.log('screenshots written');
