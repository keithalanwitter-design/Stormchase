/**
 * Unified synthetic "environment" used by the Playground and demo hotspots.
 * One set of ingredients drives WHIRL v0.1, STCI (hypothesis) and STP for comparison.
 */
import { computeWhirl, type StormMode } from './whirl';
import { computeStci } from './stci';
import { computeStp } from './stp';

export interface Environment {
  srh500: number; esrh: number; effShearKt: number; mlcape: number; cape03: number; mllclM: number; mlcin: number;
  streamwiseFrac500: number; sfc850TdDep: number; thetaVGrad: number; mode: StormMode; boundary: boolean;
}

export const KT_TO_MS = 0.514444;

export function scoreEnvironment(e: Environment) {
  const whirl = computeWhirl({ srh500: e.srh500, effShearKt: e.effShearKt, mlcape: e.mlcape, mllclM: e.mllclM, mlcin: e.mlcin, mode: e.mode, boundary: e.boundary });
  const stci = computeStci({ srh500: e.srh500, streamwiseFrac500: e.streamwiseFrac500, cape03: e.cape03, mllclM: e.mllclM, sfc850TdDep: e.sfc850TdDep,
    thetaVGrad: e.thetaVGrad, hasEffectiveInflow: e.mlcape >= 100 && e.mlcin > -250, bwdMs: e.effShearKt * KT_TO_MS, mlcin: e.mlcin });
  const stp = computeStp({ mlcape: e.mlcape, esrh: e.esrh, ebwdMs: e.effShearKt * KT_TO_MS, mllclM: e.mllclM, mlcin: e.mlcin });
  return { whirl, stci, stp };
}

export interface Preset { id: string; name: string; blurb: string; env: Environment }
export const PRESETS: Preset[] = [
  { id: 'plains', name: 'Classic Plains', blurb: 'Dryline + strong low-level jet, discrete supercells.',
    env: { srh500: 260, esrh: 380, effShearKt: 58, mlcape: 2600, cape03: 110, mllclM: 900, mlcin: -35, streamwiseFrac500: 0.82, sfc850TdDep: 2.5, thetaVGrad: 2.5, mode: 'discrete', boundary: false } },
  { id: 'hslc', name: 'HSLC Dixie', blurb: 'High shear, low CAPE cool-season night event.',
    env: { srh500: 300, esrh: 420, effShearKt: 65, mlcape: 450, cape03: 55, mllclM: 550, mlcin: -15, streamwiseFrac500: 0.75, sfc850TdDep: 1.5, thetaVGrad: 1.5, mode: 'mixed', boundary: false } },
  { id: 'ilwf', name: 'Illinois warm front', blurb: 'Backed winds along a warm front; boundary-anchored cells.',
    env: { srh500: 210, esrh: 300, effShearKt: 50, mlcape: 1400, cape03: 85, mllclM: 750, mlcin: -25, streamwiseFrac500: 0.8, sfc850TdDep: 2, thetaVGrad: 4, mode: 'discrete', boundary: true } },
  { id: 'hail', name: 'Hail-only CAPE bust', blurb: 'Huge instability, weak low-level shear, high bases, strong cap.',
    env: { srh500: 60, esrh: 110, effShearKt: 42, mlcape: 4200, cape03: 40, mllclM: 1800, mlcin: -140, streamwiseFrac500: 0.45, sfc850TdDep: 9, thetaVGrad: 0.3, mode: 'discrete', boundary: false } },
];

/** Plain-language explanation of what is driving / limiting the WHIRL score. */
export function narrate(e: Environment): string[] {
  const { whirl, stci, stp } = scoreEnvironment(e);
  const t = whirl.terms;
  const out: string[] = [];
  const named: [string, number][] = [['low-level helicity (SRH500)', t.srhTerm / 2], ['deep-layer shear', t.sShear], ['instability', t.sCape], ['cloud-base height (LCL)', t.sLcl], ['capping (CIN)', t.sCin]];
  const limiting = named.reduce((a, b) => (b[1] < a[1] ? b : a));
  if (t.sShear === 0) out.push('Effective shear is under 25 kt, so WHIRL zeroes out: storms are unlikely to organize into supercells.');
  else if (limiting[1] < 0.6) out.push(`The main limiter is ${limiting[0]}.`);
  if (e.srh500 >= 200) out.push('Near-ground helicity is strong — the single best tornado-vs-bust discriminator in the matched-case research.');
  else if (e.srh500 < 100) out.push('0–500 m SRH is weak; even big CAPE rarely makes up for that.');
  if (e.mlcape >= 3000 && e.srh500 < 120) out.push('Classic “chasing CAPE” trap: impressive instability, but this looks more like a hail day.');
  if (e.mlcape < 700 && e.effShearKt >= 50) out.push('High-shear / low-CAPE regime — don’t write it off; many QLCS and cool-season tornadoes form here.');
  if (e.mllclM > 1500) out.push('High cloud bases reduce tornado odds.');
  if (e.mlcin <= -100) out.push('A strong cap may keep surface-based storms from forming at all.');
  if (e.mode === 'linear') out.push('Linear mode halves WHIRL: embedded, brief tornadoes at most.');
  if (e.boundary) out.push('A boundary is boosting local low-level spin (×1.2).');
  const verdict = whirl.category === 'high-end' ? 'High-end setup on the draft scale.' : whirl.category === 'chaseable' ? 'Chaseable on the draft scale.' : 'Low-odds day on the draft scale.';
  out.unshift(`${verdict} WHIRL ${whirl.score.toFixed(2)}, STCI ${stci.score.toFixed(1)}/10, STP ${stp.toFixed(2)}.`);
  return out;
}
