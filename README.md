# STORMCHASE · WHIRL Forecast Center (DEMO)

Globe-to-regional severe-weather Forecast Center. React + TypeScript + Vite + MapLibre GL JS (globe projection).

**Status:** local demo. WHIRL-E hotspots are **synthetic DEMO data** (environmental favorability regions, never tornado paths). SPC Day 1 outlooks and NWS alerts are **live** official feeds. Not deployed. No location access.

## Commands
```bash
npm install
npm run dev          # http://localhost:5173 (with /proxy/spc and /proxy/nws fallbacks)
npm run build        # tsc type-check + vite build -> dist/
npm run preview      # serve dist/ at http://127.0.0.1:4173 (same proxies)
npm run lint         # eslint
npm test             # vitest unit tests (WHIRL, STCI, feeds, geo, demo data)
npm run smoke        # build smoke test: headless Chrome against running preview
npm run screenshots  # writes screenshots/*.png (preview must be running)
```
Smoke/screenshots use `playwright-core` with system Chrome (`CHROME_PATH`, default `/usr/bin/google-chrome`) and `SMOKE_URL` (default preview URL).

## v2 (North America / US focus)
- Scroll-driven story landing (globe → continental hotspots → regional corridor → storm environment), animated reveal panels, progress dots, loading splash
- Map constrained to North America (maxBounds) with CONUS default; areas outside the US dimmed
- 7 synthetic US corridors (Plains, Midwest, Illinois, Dixie) on a fictional Day 3 → Day 0 system; pulsing polygons, hover tooltips, pitched fly-to
- 7-tab evidence card: animated gauges, synthetic Skew-T + hodograph (SVG), WHIRL timeline chart across models, model table (WHIRL/STCI/STP), SPC, analogs, chase plan
- WHIRL Playground with presets (Classic Plains, HSLC Dixie, Illinois warm front, Hail-only CAPE bust): WHIRL vs STCI vs STP + live narrative
- Smooth play mode; light haptics (navigator.vibrate) on supported phones
- Pages: `npx vite build -c vite.single.config.ts && cp /tmp/single/index.html docs/index.html`

## Features
- Cinematic spinning globe landing → smooth `flyTo` into US regional map
- Layer manager: toggle, opacity, legend, source, last-updated / error per layer
- Model selector (HRRR/RAP/NAM3k/GFS — synthetic) + forecast-hour slider with play
- WHIRL-E demo hotspots with evidence cards: ingredients × terms, timing, model disagreement, live SPC lookup at hotspot center, analogs; **WHIRL v0.1 / STCI formula toggle**
- SPC comparison panel: synced mini-map of live SPC Day 1 categorical + tornado, issue/valid/expire, forecaster, Last-Modified, retry on error
- WHIRL v0.1 interactive calculator
- Offline place search (no geocoder, no geolocation)

## Layout
`src/lib/whirl.ts` WHIRL v0.1 · `src/lib/stci.ts` STCI hypothesis · `src/lib/feeds.ts` SPC/NWS fetch · `src/data/demo.ts` synthetic data · `src/components/*` UI · `db/` schema · `pipeline/` Python scaffolding (untested).
Basemap: Esri World Dark Gray Canvas raster (public tiles; check terms before any public deploy).

## Chaser Feed (static JSON)
The panel reads `./feed/chasers.json` relative to the page (`docs/feed/chasers.json` on Pages; `public/feed` symlinks to it for dev/preview), with a `?t=` cache-buster and a 2-minute refresh while open. It's third-party content, not WHIRL input. If the JSON is missing or more than 3 h old, the panel shows a warning and direct X / live links. The X embed is an optional extra.

**Scheduled refresh procedure** (≤ 6 X reads per run; limit is 30/min):
1. `x.get_users_by_usernames({usernames:["ReedTimmerUSA","ryanhallyall","MaxVelocityWX","StormNetWx","NWSWPC"]})` → save the raw result to `.feed-raw/users.json`
2. For each user id: `x.get_users_posts({id, max_results:5, exclude:"replies,retweets", "post.fields":"created_at,attachments", expansions:"attachments.media_keys", "media.fields":"url,preview_image_url,type"})` → save to `.feed-raw/<handle>.json`
3. `node scripts/update-feed.mjs --commit`. It writes `docs/feed/chasers.json` and commits and pushes only when posts changed. It exits 0 when it changed the file, 3 when unchanged, and 1 on error.
To add an account, add it to `CHASERS` in `src/lib/chasers.ts` and to `HANDLES` in `scripts/update-feed.mjs`.

## Live mode (default in the Forecast Center)
Header toggle `● LIVE / DEMO`. LIVE hides the demo hotspots and shows only real data:
- RainViewer radar mosaic loop (13 × 10-min frames, refresh 5 min; only the current and next frames are requested to stay under rate limits; tiles z ≤ 7)
- SPC Day 1 categorical + tornado %, hatched CIG/sig (pattern fill), Day 2/3 categorical outlines (toggle in Layers), SPC Mesoscale Discussions
- NWS watch/warning polygons (mapservices WWA, including zone-based watches). Tap one for the headline, expiry in CT and description from api.weather.gov
- NHC forecast cone/track for all active storms (NWS mapservices)
- "Live now" chip: tornado warning/watch counts (api.weather.gov), SPC max tornado %, CIG/hatched flag, MD count
