/**
 * STCI — experimental composite (second formula alongside WHIRL v0.1).
 * ALL WEIGHTS, MIDPOINTS, SLOPES, RANGES AND GATES ARE UNVERIFIED HYPOTHESES.
 *
 * STCI = 10 × Σ wᵢ·sᵢ × g_EIL × g_BWD × g_CIN   (range 0–10)
 */
export const STCI_VERSION = 'stci-v0.0-hypothesis';

export interface StciInputs {
  srh500: number;              // m²/s²
  streamwiseFrac500: number;   // 0–1, streamwise vorticity fraction 0–500 m
  cape03: number;              // J/kg, 0–3 km CAPE
  mllclM: number;              // m
  sfc850TdDep: number;         // °C, surface–850 hPa mean dewpoint depression
  thetaVGrad: number;          // K per 10 km, boundary virtual-potential-temperature gradient
  hasEffectiveInflow: boolean; // effective inflow layer present
  bwdMs: number;               // effective bulk wind difference, m/s
  mlcin: number;               // J/kg (negative)
}

export const sigmoid = (x: number, x0: number, k: number) => 1 / (1 + Math.exp(-k * (x - x0)));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** linear 0..1 over [lo,hi]; inverted when `invert` (lower is better) */
export const ramp = (x: number, lo: number, hi: number, invert = false) => { const t = clamp01((x - lo) / (hi - lo)); return invert ? 1 - t : t; };

export const STCI_WEIGHTS = { srh500: 0.28, streamwise: 0.2, cape03: 0.18, lcl: 0.12, tdDep: 0.12, thetaV: 0.1 } as const;

export function stciSubIndices(i: StciInputs) {
  return {
    srh500: sigmoid(i.srh500, 100, 0.035),
    streamwise: sigmoid(i.streamwiseFrac500, 0.65, 10),
    cape03: sigmoid(i.cape03, 65, 0.06),
    lcl: ramp(i.mllclM, 600, 1600, true),
    tdDep: ramp(i.sfc850TdDep, 1.5, 9, true),
    thetaV: ramp(i.thetaVGrad, 0, 5),
  };
}
/** EIL gate: 0 without an effective inflow layer. */
export const gEIL = (has: boolean) => (has ? 1 : 0);
/** BWD gate: suppressed (0) below 12.5 m/s. */
export const gBWD = (ms: number) => (ms < 12.5 ? 0 : 1);
/** CIN gate: 1 down to −50 J/kg, linear throttle to 0 at −150 J/kg. */
export const gCIN = (cin: number) => (cin >= -50 ? 1 : cin <= -150 ? 0 : (cin + 150) / 100);

export function computeStci(i: StciInputs) {
  for (const [k, v] of Object.entries(i)) if (typeof v === 'number' && !Number.isFinite(v)) throw new RangeError(`STCI input ${k} must be finite`);
  const sub = stciSubIndices(i);
  const weighted = (Object.keys(STCI_WEIGHTS) as (keyof typeof STCI_WEIGHTS)[]).reduce((a, k) => a + STCI_WEIGHTS[k] * sub[k], 0);
  const gates = { eil: gEIL(i.hasEffectiveInflow), bwd: gBWD(i.bwdMs), cin: gCIN(i.mlcin) };
  const score = 10 * weighted * gates.eil * gates.bwd * gates.cin;
  return { score, weighted, sub, gates, version: STCI_VERSION };
}
