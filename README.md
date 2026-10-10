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
