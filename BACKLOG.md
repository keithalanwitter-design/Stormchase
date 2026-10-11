# Backlog (prioritized)

P0 = next session. Milestones per handoff (M1–M2 delivered as this demo shell).

| # | Pri | MS | Item |
|---|-----|----|------|
| 1 | P0 | M3 | Move feed proxy to a Cloudflare Worker with caching + UA header; keep dev proxy |
| 2 | P0 | M3 | NWS alerts: per-event popups, expires/issued, filter UI, polygon-less alerts via zone geometry |
| 3 | P0 | M3 | SPC Day 2/3 + hatched sig-tor (CIG) rendering with pattern fill; MD/watch overlays |
| 4 | done | — | Push repo to GitHub + CI (landed 2026-10-10: origin/main synced, CI green, Pages live) |
| 5 | P1 | M5 | HRRR extraction with Herbie + MetPy → vertical_profiles (SRH500, streamwise frac, CAPE0–3 …) |
| 6 | P1 | M5 | Environmental layer tiles (raster/vector) from HRRR/RAP; replace synthetic inputs per model/fhr |
| 7 | P1 | M4 | Apply/validate db/schema.sql (diff vs Keith's original); load SPC actual tracks + NCEI |
| 8 | P1 | M4 | Pilot 10–20 cases + matched controls; replay timeline; test pipeline/ scripts |
| 9 | P1 | M4 | NEXRAD pre-onset fetcher hardening (10–30 min lead), store keys in radar_volumes |
| 10 | P1 | M6 | WHIRL v0.1 vs STCI vs STP comparison dashboard; outbreak-day splits; no hindsight leakage |
| 11 | P2 | M6 | Tune/verify STCI weights & gates (all hypotheses); decide BWD step vs ramp |
| 12 | P2 | M5 | Sounding/hodograph view per hotspot |
| 13 | P2 | M7 | Live Chase Center: radar reflectivity/velocity, storm objects, opt-in GPS, safety-first routing |
| 14 | P2 | — | Code-split MapLibre (bundle ~1.3 MB), self-host glyphs, basemap licensing review before deploy |
| 15 | P2 | — | Inspect Keith's HTML prototype (ac91c7f…html) and port UI ideas; a11y pass |

## v2 follow-ups
| 16 | P1 | — | Real US-state/CONUS boundary (Natural Earth) instead of simplified outline mask |
| 17 | P1 | M5 | Replace synthetic soundings with HRRR point soundings (Herbie + MetPy) |
| 18 | P2 | — | Swipe gestures between hotspots on the mobile sheet; drag-to-resize sheet |
| 19 | P2 | — | iOS has no vibration API — consider subtle audio/visual tap feedback |
