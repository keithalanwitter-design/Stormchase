// Smoke test: loads the running preview (or SMOKE_URL) in headless Chrome and exercises the main flows.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
if (!process.env.SMOKE_URL && !existsSync('dist/index.html')) { console.error('dist/index.html missing — run npm run build'); process.exit(1); }
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
const fail = (m) => { console.error('SMOKE FAIL:', m); process.exit(1); };
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 20000 });
await page.waitForSelector('.splash.gone', { timeout: 30000 });
const marker = await page.getAttribute('.app', 'data-build');
// 1. Loads straight into LIVE
await page.waitForSelector('[data-testid="mode-live"]');
if (await page.locator('[data-testid="demo-banner"]').count()) fail('demo banner visible on load');
await page.waitForSelector('[data-testid="live-chip"]');
await page.waitForFunction(() => !/Loading radar/.test(document.querySelector('[data-testid="radar-bar"]')?.textContent ?? ''), null, { timeout: 15000 });
const radarText = await page.textContent('[data-testid="radar-bar"] .time b');
await page.click('[data-testid="live-chip"]');
const liveText = (await page.textContent('[data-testid="live-detail"]')).replace(/\s+/g, ' ');
await page.click('[data-testid="live-chip"]');
// 2. How it works + FAQ
await page.click('[data-testid="how-link"]');
await page.waitForSelector('[data-testid="faq"]');
const faqCount = await page.locator('[data-testid="faq"] details').count();
await page.click('[data-testid="faq"] details:nth-child(2) summary');
if (!(await page.locator('[data-testid="faq"] details:nth-child(2)').evaluate((d) => d.open))) fail('FAQ did not open');
// 3. Demo walkthrough from the info page card, to the end
await page.click('[data-testid="info-demo"]');
await page.waitForSelector('[data-testid="tour-card"]'); await page.waitForSelector('[data-testid="demo-banner"]');
let steps = 1;
while (await page.locator('[data-testid="tour-next"]').count()) {
  await page.click('[data-testid="tour-next"]'); steps++; await page.waitForTimeout(300);
  if (steps === 3 && !(await page.locator('[data-testid="hotspot-card"]').count())) fail('step 3 did not open a hotspot card');
}
await page.click('[data-testid="tour-back-live"]');
await page.waitForSelector('[data-testid="mode-live"]');
if (await page.locator('[data-testid="demo-banner"]').count()) fail('demo banner still shown after Back to live');
// 4. Header demo entry + hotspot card tabs + Playground
await page.click('[data-testid="try-demo"]'); await page.waitForSelector('[data-testid="tour-card"]');
await page.click('.tour-exit'); await page.waitForSelector('[data-testid="mode-live"]');
await page.evaluate(() => window.__stormchase.select('hs-ozark'));
await page.waitForSelector('[data-testid="hotspot-card"]'); await page.waitForSelector('[data-testid="demo-banner"]');
for (const t of ['Sounding', 'Timeline', 'Models', 'SPC', 'Analogs', 'Chase plan']) { await page.click(`.card-tabs >> text="${t}"`); await page.waitForTimeout(80); }
await page.click('.tabs >> text=Playground');
await page.click('.presets >> text=Hail-only CAPE bust');
const narr = await page.textContent('.playground .narr');
if (!/chasing CAPE/.test(narr ?? '')) fail('Playground narrative did not update');
// 5. Chaser Feed
await page.click('.tabs >> text=Chasers');
await page.waitForSelector('[data-testid="post-card"]', { timeout: 15000 });
const posts = await page.locator('[data-testid="post-card"]').count();
await browser.close();
if (errors.length) fail('Page errors: ' + errors.join(' | '));
console.log(`Live: ${radarText} | ${liveText.slice(0, 160)}`);
console.log(`SMOKE OK (${marker}): live-first load, FAQ (${faqCount} Qs), demo walkthrough ${steps} steps → back to live, hotspot tabs, Playground, Chaser Feed (${posts} posts)`);
