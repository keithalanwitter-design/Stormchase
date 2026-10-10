import { chromium } from 'playwright-core';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173/';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args });
const settle = async (p, ms = 3500) => { await p.waitForFunction(() => window.__stormchase?.map && !window.__stormchase.map.isMoving(), null, { timeout: 30000 }); await p.waitForTimeout(ms); };
const scrollTo = (p, i) => p.evaluate((n) => document.querySelector(`[data-step="${n}"]`).scrollIntoView({ behavior: 'instant' }), i);

const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL); await d.waitForSelector('.splash.gone', { timeout: 30000 }); await settle(d, 5000);
await d.screenshot({ path: 'screenshots/v2-01-desktop-story-globe.png' });
await scrollTo(d, 3); await d.waitForTimeout(800); await settle(d, 5000);
await d.screenshot({ path: 'screenshots/v2-02-desktop-story-storm-environment.png' });
await d.evaluate(() => window.__stormchase.enter()); await d.waitForTimeout(600); await settle(d, 1000);
await d.evaluate(() => window.__stormchase.select('hs-ilwf')); await d.waitForTimeout(600); await settle(d, 1000);
await d.click('.card-tabs >> text="Sounding"'); await d.waitForTimeout(2000); await settle(d, 2000);
await d.screenshot({ path: 'screenshots/v2-03-desktop-hotspot-sounding.png' });
await d.click('.tabs >> text=Playground'); await d.click('.presets >> text=HSLC Dixie'); await d.waitForTimeout(1200);
await d.screenshot({ path: 'screenshots/v2-04-desktop-playground.png' });

const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(URL); await m.waitForSelector('.splash.gone', { timeout: 30000 }); await settle(m, 4000);
await m.screenshot({ path: 'screenshots/v2-05-mobile-story.png' });
await m.evaluate(() => window.__stormchase.enter()); await m.waitForTimeout(600); await settle(m, 1000);
await m.evaluate(() => window.__stormchase.select('hs-ozark')); await m.waitForTimeout(600); await settle(m, 2500);
await m.screenshot({ path: 'screenshots/v2-06-mobile-hotspot-gauges.png' });
await m.click('.card-tabs >> text="Timeline"'); await m.waitForTimeout(1200);
await m.screenshot({ path: 'screenshots/v2-07-mobile-timeline.png' });
await browser.close();
console.log('screenshots written');
