// Build smoke test: verifies dist/ exists, then loads the preview in headless Chrome
// and asserts the app renders, a WebGL canvas exists, and no uncaught page errors occur.
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
if (!existsSync('dist/index.html')) { console.error('dist/index.html missing — run npm run build'); process.exit(1); }
if (!readFileSync('dist/index.html', 'utf8').includes('id="root"')) { console.error('root element missing'); process.exit(1); }
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 20000 });
await page.waitForSelector('text=Enter Forecast Center', { timeout: 10000 });
await page.waitForFunction(() => window.__stormchase?.map, null, { timeout: 20000 });
await page.click('text=Enter Forecast Center');
await page.waitForSelector('[aria-label="Forecast hour"]');
await page.evaluate(() => window.__stormchase.select('hs-ozark'));
await page.waitForSelector('[data-testid="hotspot-card"]');
await browser.close();
if (errors.length) { console.error('Page errors:', errors); process.exit(1); }
console.log('SMOKE OK: app rendered, globe canvas present, Forecast Center + hotspot card work');
