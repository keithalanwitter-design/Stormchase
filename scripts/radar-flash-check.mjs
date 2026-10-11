// Samples the map canvas rapidly during the radar loop (mobile emulation) so blank flashes can be detected.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const OUT = process.env.OUT ?? '/tmp/frames';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(URL); await p.waitForSelector('.splash.gone', { timeout: 30000 });
await p.waitForFunction(() => window.__stormchase?.map && !window.__stormchase.map.isMoving(), null, { timeout: 30000 });
await p.waitForFunction(() => { const m = /(\d+)\/(\d+) loaded/.exec(document.querySelector('[data-testid="radar-bar"]')?.textContent ?? ''); return m && +m[1] >= Math.min(8, +m[2]); }, null, { timeout: 60000 });
await p.waitForTimeout(1500);
const labels = [];
for (let i = 0; i < 60; i++) {
  await p.screenshot({ path: `${OUT}/f${String(i).padStart(2, '0')}.png`, clip: { x: 0, y: 100, width: 390, height: 480 } });
  labels.push(await p.textContent('[data-testid="radar-bar"] .time'));
  await p.waitForTimeout(120);
}
writeFileSync(`${OUT}/labels.json`, JSON.stringify(labels));
await b.close();
