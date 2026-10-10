# Architecture

## Today (M2 shell + first M3 feeds)
```
Browser (React SPA, Vite)
 ├─ MapView (MapLibre, globe projection)  ← sources: whirl(demo), spccat, spctorn, nws
 ├─ Panels: Layers · SPC compare (2nd MapLibre map, synced) · WHIRL calculator
 ├─ HotspotCard (WHIRL v0.1 | STCI toggle)
 ├─ lib/whirl.ts  pure TS, unit-tested (documented v0.1 formula)
 ├─ lib/stci.ts   pure TS, unit-tested (experimental composite, weights = hypotheses)
 ├─ lib/feeds.ts  fetch direct → fallback /proxy/* → graceful error (never throws)
 └─ data/demo.ts  deterministic synthetic hotspots per model × forecast hour
Vite dev/preview proxy: /proxy/spc → www.spc.noaa.gov, /proxy/nws → api.weather.gov (sets UA)
```
- SPC & NWS currently return `Access-Control-Allow-Origin: *`, so direct fetch works; proxy is a fallback.
- Polling: SPC 10 min, NWS 2 min. Last good data retained on error; errors surfaced in UI.
- Demo-vs-live separation: only `whirl` layer is `demo: true`; every demo surface carries a DEMO badge and a global ribbon.
- Hotspots are generated only where demo WHIRL ≥ 0.5; they disappear outside the synthetic window (no invented live hotspots).
- Privacy: no GeolocateControl, no geocoder calls, no analytics.

## Formulas
- **WHIRL v0.1** = SRH500/75 × S_shear × S_CAPE × S_LCL × S_CIN × M_mode × M_boundary (from WHIRL Index Research Program). Draft scale <1 / 1–3 / 3+.
- **STCI (experimental)** = 10 × Σwᵢsᵢ × g_EIL × g_BWD × g_CIN. Sub-indices: SRH500 sigmoid (w .28, x0 100, k .035), streamwise fraction sigmoid (.20, .65, 10), CAPE0–3 sigmoid (.18, 65, .06), MLLCL inverted ramp [600,1600] (.12), sfc–850 Td depression inverted [1.5,9] (.12), boundary θv gradient [0,5] K/10 km (.10). Gates: EIL presence; BWD < 12.5 m/s → 0; CIN 1 to −50, linear to 0 at −150. **All weights unverified hypotheses.** BWD gate implemented as a hard step (open question: ramp?).

## Research data layer (scaffolding, untested)
- `db/schema.sql` — PostGIS: `tornado_ground_truth`, `vertical_profiles` (srh_0_500m, srh_0_1km, effective_srh, shear, streamwise_vort_fraction_0_500m, storm motion, mlcape/sbcape/cape_0_3km, mlcin, ml_lcl, sfc_850 dewpoint depression, stp, whirl_core), `radar_volumes`, `case_study_samples` (10–30 min pre-onset lead CHECK). DuckDB `analytical_mart` view in comments. Reconstructed from a pasted outline — diff against the original.
- `pipeline/` — Keith's research pipeline (as provided) and a NEXRAD pre-onset fetcher (`unidata-nexrad-level2`, Py-ART).
- Next: HRRR extraction with **Herbie + MetPy** → `vertical_profiles`, then tiles.

## Target (per handoff)
Cloudflare Pages (SPA) + Workers (feed proxy/cache, secrets) + R2 (tiles, case assets); Python xarray/MetPy/cfgrib jobs for grids; Postgres/PostGIS for cases/polygons; GitHub CI (lint, test, build, smoke).
