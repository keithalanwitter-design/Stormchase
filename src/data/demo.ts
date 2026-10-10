/**
 * SYNTHETIC DEMO DATA — NOT REAL FORECASTS.
 * Hotspots are hypothetical environmental-favorability regions over the United States used to
 * exercise the UI. They are never tornado paths and never derived from live model output.
 * Storyline: a fictional 3-day spring system (Day 3 → Day 0) moving from the Plains to Dixie.
 */
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { scoreEnvironment, type Environment } from '../lib/scenario';

export const DEMO_LABEL = 'DEMO · synthetic data · not a forecast';

export const MODELS = [
  { id: 'HRRR', name: 'HRRR (demo)' }, { id: 'RAP', name: 'RAP (demo)' }, { id: 'NAM3K', name: 'NAM 3 km (demo)' }, { id: 'GFS', name: 'GFS (demo)' },
] as const;
export type ModelId = (typeof MODELS)[number]['id'];
export const MAX_FHR = 84;

/** Synthetic model run init: 12Z, three days before the final event day. */
export const DEMO_RUN_INIT = '2027-04-24T12:00:00Z';

export interface ChasePlan { target: string; targetLonLat: [number, number]; depart: string; route: string; safety: string[] }
export interface DemoHotspotDef {
  id: string; name: string; region: 'Plains' | 'Midwest' | 'Illinois' | 'Dixie';
  center: [number, number]; radiiKm: [number, number]; rotationDeg: number;
  env: Environment; peakFhr: number; spreadHr: number; modelBias: Record<ModelId, number>;
  timing: string; spcContext: string; analogs: { date: string; note: string; similarity: number }[]; notes: string; chase: ChasePlan;
}

const SAFE = ['Never core-punch; approach from the south/southeast with an escape route east.', 'Keep NOAA Weather Radio and official NWS warnings on — WHIRL is not a warning.'];

export const HOTSPOT_DEFS: DemoHotspotDef[] = [
  { id: 'hs-ksok', name: 'Central Oklahoma dryline', region: 'Plains', center: [-97.7, 36.1], radiiKm: [180, 90], rotationDeg: 80,
    env: { srh500: 250, esrh: 360, effShearKt: 56, mlcape: 2800, cape03: 110, mllclM: 950, mlcin: -45, streamwiseFrac500: 0.8, sfc850TdDep: 2.5, thetaVGrad: 2, mode: 'discrete', boundary: false },
    peakFhr: 33, spreadHr: 7, modelBias: { HRRR: 1.0, RAP: 0.95, NAM3K: 1.15, GFS: 0.8 },
    timing: 'Dryline initiation ~20Z west of I-35; discrete supercells 21–02Z as the low-level jet ramps up after sunset.',
    spcContext: 'Hypothetical: inside a demo ENH area with 10% tornado; WHIRL core aligns with the hatched area.',
    analogs: [{ date: '1999-05-03 (illustrative)', note: 'Strong LLJ, discrete dryline storms', similarity: 0.71 }, { date: '2013-05-20 (illustrative)', note: 'Dryline/triple-point supercells', similarity: 0.64 }, { date: '2024-04-27 (illustrative)', note: 'Plains outbreak, evening LLJ', similarity: 0.58 }],
    notes: 'Textbook Plains setup — the demo “classic” case.',
    chase: { target: 'Kingfisher, OK', targetLonLat: [-97.93, 35.86], depart: 'Leave by 1:00 PM CDT', route: 'I-44 SW → OK-33 W; reposition north on US-81', safety: [...SAFE, 'Rush-hour traffic near OKC metro — stay west of town.'] } },
  { id: 'hs-redriver', name: 'Red River / North Texas', region: 'Plains', center: [-97.9, 33.8], radiiKm: [150, 90], rotationDeg: 10,
    env: { srh500: 110, esrh: 160, effShearKt: 45, mlcape: 3600, cape03: 45, mllclM: 1450, mlcin: -120, streamwiseFrac500: 0.5, sfc850TdDep: 6.5, thetaVGrad: 0.6, mode: 'discrete', boundary: false },
    peakFhr: 33, spreadHr: 5, modelBias: { HRRR: 0.85, RAP: 1.0, NAM3K: 1.25, GFS: 1.0 },
    timing: 'Capped until ~23Z; one or two isolated dryline storms possible near sunset.',
    spcContext: 'Hypothetical: SLGT driven by large hail; 2% tornado.',
    analogs: [{ date: '2015-05-16 (illustrative)', note: 'Strong cap, conditional dryline', similarity: 0.62 }, { date: '2012-04-03 (illustrative)', note: 'Huge hail, few tornadoes', similarity: 0.55 }],
    notes: 'The demo “chasing CAPE” trap: big instability, weak near-ground SRH, strong cap, high bases.',
    chase: { target: 'Wichita Falls, TX', targetLonLat: [-98.49, 33.91], depart: 'Optional — hold until 3 PM CDT', route: 'US-287 NW; stay south of the Red River crossings', safety: [...SAFE, 'Giant hail is the main threat — protect the windshield.'] } },
  { id: 'hs-ozark', name: 'Ozark Plateau / SW Missouri', region: 'Midwest', center: [-93.5, 37.3], radiiKm: [170, 95], rotationDeg: 35,
    env: { srh500: 230, esrh: 330, effShearKt: 55, mlcape: 1900, cape03: 90, mllclM: 850, mlcin: -40, streamwiseFrac500: 0.78, sfc850TdDep: 2.5, thetaVGrad: 3.5, mode: 'discrete', boundary: true },
    peakFhr: 57, spreadHr: 7, modelBias: { HRRR: 1.0, RAP: 0.9, NAM3K: 1.15, GFS: 0.75 },
    timing: 'Initiation ~20–21Z along the warm front; discrete window ~21–02Z before upscale growth.',
    spcContext: 'Hypothetical: ENH area; WHIRL core sits ~60 mi north of the 10% tornado line.',
    analogs: [{ date: '2011-05-22 (illustrative)', note: 'Warm-front-anchored discrete supercells', similarity: 0.69 }, { date: '2019-05-22 (illustrative)', note: 'Strong 0–500 m SRH, modest CAPE', similarity: 0.6 }],
    notes: 'Low LCLs and an active warm front boost the boundary multiplier. Terrain and trees limit visibility.',
    chase: { target: 'Mount Vernon, MO', targetLonLat: [-93.82, 37.1], depart: 'Leave by 12:30 PM CDT', route: 'I-44 W; drop south on MO-39 as needed', safety: [...SAFE, 'Hilly, tree-lined roads — rain-wrapped tornadoes are hard to see. Keep distance.'] } },
  { id: 'hs-ilwf', name: 'Central Illinois warm front', region: 'Illinois', center: [-89.4, 40.2], radiiKm: [150, 75], rotationDeg: 70,
    env: { srh500: 210, esrh: 300, effShearKt: 50, mlcape: 1300, cape03: 80, mllclM: 760, mlcin: -25, streamwiseFrac500: 0.8, sfc850TdDep: 2, thetaVGrad: 4, mode: 'discrete', boundary: true },
    peakFhr: 57, spreadHr: 6, modelBias: { HRRR: 1.1, RAP: 1.0, NAM3K: 0.8, GFS: 0.9 },
    timing: 'Cells ride the warm front 22–01Z; mode may trend linear after dark.',
    spcContext: 'Hypothetical: SLGT with 5% tornado; WHIRL footprint slightly north along the front.',
    analogs: [{ date: '2013-11-17 (illustrative)', note: 'High-shear, modest-CAPE Illinois event', similarity: 0.66 }, { date: '2004-07-13 (illustrative)', note: 'Warm-front anchored long-tracker', similarity: 0.52 }],
    notes: 'Home turf. Backed surface winds along the front locally boost SRH.',
    chase: { target: 'Lincoln, IL', targetLonLat: [-89.36, 40.15], depart: 'Leave by 2:00 PM CDT', route: 'I-55 S; grid roads east-west along IL-10', safety: [...SAFE, 'Flat, open grid — great visibility, but watch for low-hanging rain-wrapped circulations.'] } },
  { id: 'hs-iowa', name: 'SE Iowa / NE Missouri', region: 'Midwest', center: [-92.0, 40.9], radiiKm: [130, 80], rotationDeg: 40,
    env: { srh500: 160, esrh: 230, effShearKt: 47, mlcape: 1600, cape03: 70, mllclM: 1050, mlcin: -30, streamwiseFrac500: 0.68, sfc850TdDep: 3.5, thetaVGrad: 1.5, mode: 'mixed', boundary: false },
    peakFhr: 54, spreadHr: 6, modelBias: { HRRR: 0.9, RAP: 1.05, NAM3K: 1.0, GFS: 1.1 },
    timing: 'Early-afternoon cells near the surface low 19–23Z.',
    spcContext: 'Hypothetical: SLGT; demo models disagree on how far north the warm sector reaches.',
    analogs: [{ date: '2014-06-30 (illustrative)', note: 'Mixed-mode surface-low day', similarity: 0.5 }],
    notes: 'Mixed mode — cells may merge quickly.',
    chase: { target: 'Kirksville, MO', targetLonLat: [-92.58, 40.19], depart: 'Leave by 11:30 AM CDT', route: 'US-61 N → US-136 W', safety: SAFE } },
  { id: 'hs-dixie', name: 'North Mississippi / Alabama (HSLC)', region: 'Dixie', center: [-88.9, 33.7], radiiKm: [190, 100], rotationDeg: 45,
    env: { srh500: 300, esrh: 420, effShearKt: 65, mlcape: 600, cape03: 60, mllclM: 550, mlcin: -15, streamwiseFrac500: 0.76, sfc850TdDep: 1.5, thetaVGrad: 1.5, mode: 'mixed', boundary: false },
    peakFhr: 78, spreadHr: 7, modelBias: { HRRR: 1.05, RAP: 1.0, NAM3K: 1.2, GFS: 0.85 },
    timing: 'Warm-sector supercells ahead of a QLCS, 15–23Z; fast storm motions (45–55 kt).',
    spcContext: 'Hypothetical: MDT with 15% tornado; WHIRL agrees on the corridor but scores lower due to modest CAPE.',
    analogs: [{ date: '2011-04-27 (illustrative)', note: 'Dixie warm-sector outbreak', similarity: 0.61 }, { date: '2021-03-25 (illustrative)', note: 'HSLC Alabama supercells', similarity: 0.65 }, { date: '2023-03-24 (illustrative)', note: 'Night-time Mississippi tornado', similarity: 0.57 }],
    notes: 'High-shear/low-CAPE regime. Not a recommended chase region: trees, hills, fast storms, poor road grid.',
    chase: { target: 'Tupelo, MS (observe only)', targetLonLat: [-88.7, 34.26], depart: 'Not recommended to chase', route: 'If going, stay on US-45 / I-22 and keep storms well to the west', safety: ['Fast storms (50+ kt) — do not try to keep up.', 'Many tornadoes rain-wrapped or after dark here.', ...SAFE] } },
  { id: 'hs-midtn', name: 'Middle Tennessee QLCS', region: 'Dixie', center: [-86.8, 35.7], radiiKm: [170, 70], rotationDeg: 20,
    env: { srh500: 280, esrh: 380, effShearKt: 62, mlcape: 450, cape03: 50, mllclM: 700, mlcin: -20, streamwiseFrac500: 0.7, sfc850TdDep: 2, thetaVGrad: 1, mode: 'linear', boundary: false },
    peakFhr: 81, spreadHr: 5, modelBias: { HRRR: 1.0, RAP: 0.9, NAM3K: 1.1, GFS: 1.0 },
    timing: 'Line arrives ~21–02Z; brief embedded QLCS circulations.',
    spcContext: 'Hypothetical: ENH (wind-driven) with 5% tornado.',
    analogs: [{ date: '2020-03-03 (illustrative)', note: 'Night-time Nashville-area tornado', similarity: 0.48 }],
    notes: 'Linear mode halves WHIRL; quick spin-ups embedded in the line.',
    chase: { target: 'Do not chase — shelter plan', targetLonLat: [-86.78, 36.16], depart: 'n/a', route: 'n/a', safety: ['QLCS tornadoes give little lead time — have a shelter plan.', ...SAFE] } },
];

/** Ellipse polygon (approximate, km on a sphere). Pure, deterministic. */
export function ellipse(center: [number, number], radiiKm: [number, number], rotDeg: number, n = 64, wobble = 0): Polygon {
  const [lon0, lat0] = center; const rot = (rotDeg * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * (i % n)) / n;
    const r = 1 + wobble * Math.sin(3 * t) * 0.5 + wobble * Math.cos(5 * t) * 0.3;
    const x = radiiKm[0] * r * Math.cos(t), y = radiiKm[1] * r * Math.sin(t);
    const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
    coords.push([lon0 + xr / (111.32 * Math.cos((lat0 * Math.PI) / 180)), lat0 + yr / 110.57]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

export const envelope = (fhr: number, peak: number, spread: number) => Math.exp(-0.5 * ((fhr - peak) / spread) ** 2);

export function envAt(def: DemoHotspotDef, model: ModelId, fhr: number): Environment {
  const e = envelope(fhr, def.peakFhr, def.spreadHr), b = def.modelBias[model], E = def.env;
  return { ...E, srh500: E.srh500 * e * b, esrh: E.esrh * e * b, effShearKt: E.effShearKt * (0.7 + 0.3 * e) * Math.sqrt(b),
    mlcape: E.mlcape * (0.4 + 0.6 * e), cape03: E.cape03 * (0.5 + 0.5 * e), mlcin: E.mlcin - 60 * (1 - e) };
}

export function whirlSeries(def: DemoHotspotDef, model: ModelId, step = 1) {
  const out: { fhr: number; score: number }[] = [];
  for (let f = 0; f <= MAX_FHR; f += step) out.push({ fhr: f, score: scoreEnvironment(envAt(def, model, f)).whirl.score });
  return out;
}

export function hotspotDetail(def: DemoHotspotDef, model: ModelId, fhr: number) {
  const env = envAt(def, model, fhr);
  const scores = scoreEnvironment(env);
  const perModel = MODELS.map((m) => { const s = scoreEnvironment(envAt(def, m.id, fhr)); return { model: m.id, score: s.whirl.score, stci: s.stci.score, stp: s.stp }; });
  const ws = perModel.map((p) => p.score); const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
  const spreadPct = mean > 0.01 ? ((Math.max(...ws) - Math.min(...ws)) / mean) * 100 : 0;
  return { def, env, scores, perModel, spreadPct };
}
export type HotspotDetail = ReturnType<typeof hotspotDetail>;

export interface HotspotProps { id: string; name: string; region: string; score: number; category: string; demo: true; model: ModelId; fhr: number }

/** Hotspots drawn only where demo WHIRL ≥ minScore — they grow, shrink and vanish with forecast hour. */
export function demoHotspots(model: ModelId, fhr: number, minScore = 0.3): FeatureCollection<Polygon, HotspotProps> {
  const features: Feature<Polygon, HotspotProps>[] = [];
  for (const def of HOTSPOT_DEFS) {
    const s = scoreEnvironment(envAt(def, model, fhr)).whirl;
    if (s.score < minScore) continue;
    const scale = 0.45 + 0.55 * Math.min(1, s.score / 4);
    features.push({ type: 'Feature', id: def.id, geometry: ellipse(def.center, [def.radiiKm[0] * scale, def.radiiKm[1] * scale], def.rotationDeg, 64, 0.12),
      properties: { id: def.id, name: def.name, region: def.region, score: Math.round(s.score * 100) / 100, category: s.category, demo: true, model, fhr } });
  }
  return { type: 'FeatureCollection', features };
}

export function validTime(fhr: number, init = DEMO_RUN_INIT): Date { return new Date(new Date(init).getTime() + fhr * 3600_000); }
/** “Day N” relative to the final event day (Day 3 at init → Day 0 on the last day). */
export function dayLabel(fhr: number): string { return `Day ${Math.max(0, 3 - Math.floor((fhr + 12) / 24))}`; }

/** Simplified CONUS outline (lon/lat) — used for the out-of-US dimming mask and US-only checks. */
export const CONUS: [number, number][] = [[-124.7,48.4],[-123,49],[-95.2,49],[-94.6,48.7],[-89.6,48],[-84.8,46.5],[-82.4,45.3],[-82.5,42.6],[-79,43.3],[-76.8,43.6],[-74.8,45],[-71.5,45],[-70,46.7],[-67.8,47.1],[-67,44.8],[-70.2,43.6],[-70.6,42.1],[-69.9,41.6],[-73.7,40.6],[-74.1,39.7],[-75.5,38.4],[-76,37],[-75.5,35.2],[-77.9,33.9],[-80.9,32],[-81.4,30.4],[-80,26.8],[-80.4,25.2],[-81.8,26.1],[-82.8,28],[-83.7,29.9],[-85.3,29.7],[-86.5,30.4],[-89.6,30.2],[-89.4,29],[-91.5,29.5],[-93.8,29.7],[-95.1,29],[-97.2,27.6],[-97.2,25.9],[-99.1,26.4],[-101.4,29.8],[-103,29],[-104.7,29.9],[-106.5,31.8],[-108.2,31.3],[-111.1,31.3],[-114.8,32.5],[-117.1,32.5],[-118.6,34],[-120.6,34.6],[-121.9,36.6],[-123.7,38.9],[-124.4,40.4],[-124.2,42],[-124,46.2],[-124.7,48.4]];
export const NORTH_AMERICA_BOUNDS: [[number, number], [number, number]] = [[-172, 7], [-40, 76]];
export const CONUS_VIEW = { center: [-95.5, 38.5] as [number, number], zoom: 3.6 };
export const outsideUsMask = (): Feature<Polygon> => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon',
  coordinates: [[[-179.9, -85], [179.9, -85], [179.9, 85], [-179.9, 85], [-179.9, -85]], [...CONUS].reverse()] } });

/** Every corridor drawn at its own peak hour — used by the story overview ("all three days at once"). */
export function peakHotspots(model: ModelId): FeatureCollection<Polygon, HotspotProps> {
  const features = HOTSPOT_DEFS.flatMap((d) => demoHotspots(model, d.peakFhr).features.filter((f) => f.id === d.id));
  return { type: 'FeatureCollection', features };
}
