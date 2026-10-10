/**
 * SYNTHETIC DEMO DATA — NOT REAL FORECASTS.
 * Hotspots are hypothetical environmental-favorability regions used to exercise the UI.
 * They are never tornado paths and never derived from live model output.
 */
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { computeWhirl, type WhirlInputs, type WhirlResult } from '../lib/whirl';
import { computeStci, type StciInputs } from '../lib/stci';

export const DEMO_LABEL = 'DEMO · synthetic data · not a forecast';

export const MODELS = [
  { id: 'HRRR', name: 'HRRR (demo)', maxFhr: 48, step: 1 },
  { id: 'RAP', name: 'RAP (demo)', maxFhr: 51, step: 1 },
  { id: 'NAM3K', name: 'NAM 3 km (demo)', maxFhr: 60, step: 1 },
  { id: 'GFS', name: 'GFS (demo)', maxFhr: 120, step: 3 },
] as const;
export type ModelId = (typeof MODELS)[number]['id'];

/** Synthetic model run: 12Z on the demo case day. */
export const DEMO_RUN_INIT = '2027-04-27T12:00:00Z';

export interface DemoHotspotDef {
  id: string; name: string; center: [number, number]; radiiKm: [number, number]; rotationDeg: number;
  base: WhirlInputs;
  /** synthetic extra ingredients for the STCI hypothesis formula */
  stciExtra: { streamwiseFrac500: number; cape03: number; sfc850TdDep: number; thetaVGrad: number; hasEffectiveInflow: boolean };
  /** valid hours (UTC offset from init) when favorability peaks; hotspot exists ± spread */
  peakFhr: number; spreadHr: number;
  /** per-model multiplier applied to SRH/shear, expresses model disagreement */
  modelBias: Record<ModelId, number>;
  timing: string; spcContext: string; analogs: { date: string; note: string }[]; notes: string;
}

export const HOTSPOT_DEFS: DemoHotspotDef[] = [
  {
    id: 'hs-ozark', name: 'Ozark Plateau / SW Missouri', center: [-93.6, 37.3], radiiKm: [170, 95], rotationDeg: 35,
    base: { srh500: 230, effShearKt: 55, mlcape: 1900, mllclM: 850, mlcin: -40, mode: 'discrete', boundary: true },
    stciExtra: { streamwiseFrac500: 0.78, cape03: 95, sfc850TdDep: 2.5, thetaVGrad: 3.5, hasEffectiveInflow: true },
    peakFhr: 10, spreadHr: 6,
    modelBias: { HRRR: 1.0, RAP: 0.9, NAM3K: 1.15, GFS: 0.75 },
    timing: 'Initiation ~20–21Z along warm front; discrete window ~21–02Z before upscale growth.',
    spcContext: 'Hypothetical: inside an SPC-style ENH area; WHIRL core sits ~60 mi north of a 10% tornado line.',
    analogs: [{ date: '2011-05-22 (illustrative)', note: 'Warm-front-anchored discrete supercells' }, { date: '2019-05-22 (illustrative)', note: 'Strong 0–500 m SRH, modest CAPE' }],
    notes: 'Low LCLs and an active warm front boost the boundary multiplier.',
  },
  {
    id: 'hs-ilmo', name: 'Central Illinois corridor', center: [-89.4, 40.1], radiiKm: [140, 70], rotationDeg: 60,
    base: { srh500: 170, effShearKt: 48, mlcape: 1100, mllclM: 1000, mlcin: -25, mode: 'mixed', boundary: false },
    stciExtra: { streamwiseFrac500: 0.7, cape03: 60, sfc850TdDep: 3, thetaVGrad: 1, hasEffectiveInflow: true },
    peakFhr: 12, spreadHr: 5,
    modelBias: { HRRR: 1.1, RAP: 1.0, NAM3K: 0.8, GFS: 0.9 },
    timing: 'Late-afternoon cells ~22–01Z; mode may trend linear after dark.',
    spcContext: 'Hypothetical: SLGT area with 5% tornado; WHIRL similar footprint, slightly east.',
    analogs: [{ date: '2013-11-17 (illustrative)', note: 'High-shear, modest-CAPE Illinois event' }],
    notes: 'Low-CAPE / high-shear regime — do not write off.',
  },
  {
    id: 'hs-redriver', name: 'Red River / N Texas', center: [-97.6, 33.9], radiiKm: [150, 90], rotationDeg: 10,
    base: { srh500: 120, effShearKt: 45, mlcape: 3200, mllclM: 1350, mlcin: -110, mode: 'discrete', boundary: false },
    stciExtra: { streamwiseFrac500: 0.5, cape03: 40, sfc850TdDep: 7, thetaVGrad: 0.5, hasEffectiveInflow: true },
    peakFhr: 9, spreadHr: 4,
    modelBias: { HRRR: 0.85, RAP: 1.0, NAM3K: 1.2, GFS: 1.0 },
    timing: 'Capped until ~23Z; isolated dryline storms possible near sunset.',
    spcContext: 'Hypothetical: MRGL/SLGT hail-driven area; tornado odds lower than CAPE suggests.',
    analogs: [{ date: '2015-05-16 (illustrative)', note: 'Strong cap, conditional dryline day' }],
    notes: 'Classic “chasing CAPE” trap: big instability, weak low-level SRH, strong cap.',
  },
];

/** Build an ellipse polygon (approximate, km on a sphere). Pure, deterministic. */
export function ellipse(center: [number, number], radiiKm: [number, number], rotDeg: number, n = 48): Polygon {
  const [lon0, lat0] = center;
  const rot = (rotDeg * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * (i % n)) / n;
    const x = radiiKm[0] * Math.cos(t), y = radiiKm[1] * Math.sin(t);
    const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
    coords.push([lon0 + xr / (111.32 * Math.cos((lat0 * Math.PI) / 180)), lat0 + yr / 110.57]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

export interface HotspotProps {
  id: string; name: string; score: number; category: string; demo: true; model: ModelId; fhr: number;
}
export interface HotspotDetail { def: DemoHotspotDef; result: WhirlResult; inputs: WhirlInputs; stciInputs: StciInputs; stci: ReturnType<typeof computeStci>; perModel: { model: ModelId; score: number }[]; spreadPct: number }

/** Temporal envelope 0..1 (Gaussian around peak). */
export const envelope = (fhr: number, peak: number, spread: number) => Math.exp(-0.5 * ((fhr - peak) / spread) ** 2);

export function inputsAt(def: DemoHotspotDef, model: ModelId, fhr: number): WhirlInputs {
  const e = envelope(fhr, def.peakFhr, def.spreadHr), b = def.modelBias[model];
  return { ...def.base, srh500: def.base.srh500 * e * b, effShearKt: def.base.effShearKt * (0.7 + 0.3 * e) * Math.sqrt(b), mlcape: def.base.mlcape * (0.4 + 0.6 * e) };
}

export function hotspotDetail(def: DemoHotspotDef, model: ModelId, fhr: number): HotspotDetail {
  const inputs = inputsAt(def, model, fhr);
  const result = computeWhirl(inputs);
  const perModel = MODELS.map((m) => ({ model: m.id, score: computeWhirl(inputsAt(def, m.id, fhr)).score }));
  const scores = perModel.map((p) => p.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spreadPct = mean > 0 ? ((Math.max(...scores) - Math.min(...scores)) / mean) * 100 : 0;
  const stciInputs = stciInputsAt(def, inputs);
  return { def, result, inputs, perModel, spreadPct, stciInputs, stci: computeStci(stciInputs) };
}

/** Hotspots shown only where demo WHIRL ≥ 0.5 (no polygon when the setup is absent). */
export function demoHotspots(model: ModelId, fhr: number, minScore = 0.5): FeatureCollection<Polygon, HotspotProps> {
  const features: Feature<Polygon, HotspotProps>[] = [];
  for (const def of HOTSPOT_DEFS) {
    const { result } = hotspotDetail(def, model, fhr);
    if (result.score < minScore) continue;
    const scale = 0.6 + 0.4 * Math.min(1, result.score / 3);
    features.push({ type: 'Feature', id: def.id, geometry: ellipse(def.center, [def.radiiKm[0] * scale, def.radiiKm[1] * scale], def.rotationDeg),
      properties: { id: def.id, name: def.name, score: Math.round(result.score * 100) / 100, category: result.category, demo: true, model, fhr } });
  }
  return { type: 'FeatureCollection', features };
}

export function validTime(fhr: number, init = DEMO_RUN_INIT): Date { return new Date(new Date(init).getTime() + fhr * 3600_000); }

export function stciInputsAt(def: DemoHotspotDef, w: WhirlInputs): StciInputs {
  return { ...def.stciExtra, srh500: w.srh500, mllclM: w.mllclM, mlcin: w.mlcin, bwdMs: w.effShearKt * 0.514444 };
}
