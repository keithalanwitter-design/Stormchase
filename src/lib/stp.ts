/**
 * Effective-layer Significant Tornado Parameter (SPC definition, simplified):
 * STP = (MLCAPE/1500) × (ESRH/150) × (EBWD/20 m/s) × ((2000−MLLCL)/1000) × ((200+MLCIN)/150)
 * EBWD term: 0 below 12.5 m/s, capped at 1.5 (30 m/s). LCL term: 1 below 1000 m, 0 above 2000 m.
 * CIN term: 1 above −50 J/kg, 0 below −200 J/kg. Used here only as a comparison baseline.
 */
export interface StpInputs { mlcape: number; esrh: number; ebwdMs: number; mllclM: number; mlcin: number }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export function computeStp(i: StpInputs): number {
  const cape = Math.max(0, i.mlcape) / 1500;
  const srh = Math.max(0, i.esrh) / 150;
  const bwd = i.ebwdMs < 12.5 ? 0 : clamp(i.ebwdMs / 20, 0, 1.5);
  const lcl = i.mllclM < 1000 ? 1 : i.mllclM > 2000 ? 0 : (2000 - i.mllclM) / 1000;
  const cin = i.mlcin > -50 ? 1 : i.mlcin < -200 ? 0 : (200 + i.mlcin) / 150;
  return cape * srh * bwd * lcl * cin;
}
