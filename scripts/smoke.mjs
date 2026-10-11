// Build smoke test: loads the running preview (or SMOKE_URL) in headless Chrome and exercises the main flows.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
if (!process.env.SMOKE_URL && !existsSync('dist/index.html')) { console.error('dist/index.html missing — run npm run build'); process.exit(1); }
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 20000 });
await page.waitForSelector('.splash.gone', { timeout: 30000 });
const marker = await page.getAttribute('.app', 'data-build');
await page.waitForSelector('[data-testid="story"]');
await page.click('.s-hero .cta');
await page.waitForSelector('[aria-label="Forecast hour"]');
await page.evaluate(() => window.__stormchase.select('hs-ozark'));
await page.waitForSelector('[data-testid="hotspot-card"]');
for (const t of ['Sounding', 'Timeline', 'Models', 'SPC', 'Analogs', 'Chase plan']) { await page.click(`.card-tabs >> text="${t}"`); await page.waitForTimeout(100); }
await page.waitForSelector('svg.tchart, .chase');
await page.click('.tabs >> text=Playground');
await page.click('.presets >> text=Hail-only CAPE bust');
const narr = await page.textContent('.playground .narr');
await page.click('.tabs >> text=Chasers');
await page.waitForSelector('[data-testid="post-card"]', { timeout: 15000 });
const posts = await page.locator('[data-testid="post-card"]').count();
const feedState = await page.getAttribute('[data-testid="chaser-feed"]', 'data-feed-state');
if (posts < 1) { console.error('no post cards'); process.exit(1); }
console.log(`Chaser Feed: ${posts} post cards, feed ${feedState}`);
await browser.close();
if (errors.length) { console.error('Page errors:', errors); process.exit(1); }
if (!/chasing CAPE/.test(narr ?? '')) { console.error('Playground narrative did not update'); process.exit(1); }
console.log(`SMOKE OK (${marker}): splash, story, Forecast Center, 7-tab evidence card, Playground presets`);
