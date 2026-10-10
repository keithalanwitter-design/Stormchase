/**
 * WHIRL v0.1 — Witter–Hart Integrated Rotational Likelihood (experimental draft).
 *
 * WHIRL = (SRH500 / 75) × S_shear × S_CAPE × S_LCL × S_CIN × M_mode × M_boundary
 *
 * All weights are starting guesses to be tuned against the case library.
 * This is NOT an operational warning product or a calibrated tornado probability.
 */
export const WHIRL_VERSION = 'v0.1-draft';

export type StormMode = 'linear' | 'mixed' | 'discrete';

export interface WhirlInputs {
  /** 0–500 m storm-relative helicity, m²/s² (observed storm motion when storms exist) */
  srh500: number;
  /** Effective bulk shear, kt */
  effShearKt: number;
  /** Mixed-layer CAPE, J/kg */
  mlcape: number;
  /** Mixed-layer LCL height, m AGL */
  mllclM: number;
  /** Mixed-layer CIN, J/kg (negative = inhibition, e.g. -50) */
  mlcin: number;
  mode: StormMode;
  boundary: boolean;
}

export interface WhirlTerms {
  srhTerm: number; sShear: number; sCape: number; sLcl: number; sCin: number; mMode: number; mBoundary: number;
}

export type WhirlCategory = 'low' | 'chaseable' | 'high-end';

export interface WhirlResult { score: number; terms: WhirlTerms; category: WhirlCategory; version: string }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function assertFinite(inputs: WhirlInputs) {
  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new RangeError(`WHIRL input ${k} must be finite`);
  }
}

export const srhTerm = (srh500: number) => Math.max(0, srh500) / 75;
/** Effective bulk shear ÷ 40 kt; 0 below 25 kt; capped at 1.5 */
export const shearTerm = (kt: number) => (kt < 25 ? 0 : clamp(kt / 40, 0, 1.5));
/** MLCAPE ÷ 1500, capped at 1.25 */
export const capeTerm = (cape: number) => clamp(cape / 1500, 0, 1.25);
/** (2000 − LCL) ÷ 1000, clamped 0–1 */
export const lclTerm = (lcl: number) => clamp((2000 - lcl) / 1000, 0, 1);
/** (250 + MLCIN) ÷ 150, clamped 0–1 (MLCIN is negative) */
export const cinTerm = (cin: number) => clamp((250 + cin) / 150, 0, 1);
export const modeMultiplier = (m: StormMode) => ({ linear: 0.5, mixed: 1.0, discrete: 1.25 })[m];
export const boundaryMultiplier = (b: boolean) => (b ? 1.2 : 1.0);

/** Draft reading scale: <1 low-odds, 1–3 chaseable, ≥3 high-end */
export function categorize(score: number): WhirlCategory {
  if (score >= 3) return 'high-end';
  if (score >= 1) return 'chaseable';
  return 'low';
}

export function computeWhirl(inputs: WhirlInputs): WhirlResult {
  assertFinite(inputs);
  const terms: WhirlTerms = {
    srhTerm: srhTerm(inputs.srh500),
    sShear: shearTerm(inputs.effShearKt),
    sCape: capeTerm(inputs.mlcape),
    sLcl: lclTerm(inputs.mllclM),
    sCin: cinTerm(inputs.mlcin),
    mMode: modeMultiplier(inputs.mode),
    mBoundary: boundaryMultiplier(inputs.boundary),
  };
  const score = Object.values(terms).reduce((a, b) => a * b, 1);
  return { score, terms, category: categorize(score), version: WHIRL_VERSION };
}
