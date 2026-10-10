/**
 * SYNTHETIC sounding + hodograph generator for DEMO visuals only.
 * Builds a plausible-looking profile from a handful of ingredients; it is not a real model sounding.
 */
import type { Environment } from './scenario';

export interface Level { z: number; p: number; t: number; td: number; u: number; v: number }

export const pressureAt = (zM: number, p0 = 1000) => p0 * Math.exp(-zM / 8000);

export function synthProfile(e: Environment, sfcT = 26): Level[] {
  const spread = Math.max(0.5, e.mllclM / 125); // LCL ≈ 125 m per °C spread
  const capDepth = Math.min(4, -e.mlcin / 35);
  const lapse = 6 + Math.min(2.5, e.mlcape / 2000); // K/km, steeper with more CAPE
  const shearMs = e.effShearKt * 0.514444;
  const curl = Math.min(18, e.srh500 / 18);
  const levels: Level[] = [];
  for (let z = 0; z <= 12000; z += 250) {
    const km = z / 1000;
    let t = sfcT - lapse * km;
    if (km > 1 && km < 2) t += capDepth * Math.sin(((km - 1) / 1) * Math.PI); // capping inversion bump
    const tdDrop = spread + (km < e.mllclM / 1000 ? km * 1.5 : km * (2.2 + e.sfc850TdDep / 4));
    const td = Math.min(t, t - tdDrop + (km < 1 ? km * 1.2 : 0));
    // Clockwise-curved low levels (rise in v first, then veer to u), then straight shear aloft
    const a = Math.min(km, 1.5) / 1.5;
    const v = 4 + curl * Math.sin((a * Math.PI) / 2);
    const u = -4 + curl * 0.35 * (1 - Math.cos((a * Math.PI) / 2)) + shearMs * (Math.min(km, 6) / 6);
    levels.push({ z, p: pressureAt(z), t, td, u, v });
  }
  return levels;
}

/** Skew-T screen transform (degC, hPa) → (x, y) in a box. */
export function skewT(t: number, p: number, w: number, h: number, pTop = 200, tMin = -40, tMax = 50) {
  const yFrac = Math.log(1000 / p) / Math.log(1000 / pTop);
  const y = h - yFrac * h;
  const skew = yFrac * 75; // degrees of skew across the plot
  const x = ((t + skew - tMin) / (tMax - tMin)) * w;
  return { x, y };
}

/** Storm-relative helicity (m²/s²) over 0..topM from a profile and storm motion (Bunkers-like right mover approx). */
export function helicity(levels: Level[], topM: number, storm: { u: number; v: number }): number {
  let h = 0;
  for (let i = 0; i < levels.length - 1 && levels[i + 1].z <= topM; i++) {
    const a = levels[i], b = levels[i + 1];
    h += (b.u - storm.u) * (a.v - storm.v) - (a.u - storm.u) * (b.v - storm.v);
  }
  return h;
}

/** Simple right-moving storm motion: 0–6 km mean wind + 7.5 m/s deviation to the right of the shear vector. */
export function bunkersRight(levels: Level[]) {
  const l6 = levels.filter((l) => l.z <= 6000);
  const mu = l6.reduce((s, l) => s + l.u, 0) / l6.length, mv = l6.reduce((s, l) => s + l.v, 0) / l6.length;
  const su = l6[l6.length - 1].u - l6[0].u, sv = l6[l6.length - 1].v - l6[0].v;
  const mag = Math.hypot(su, sv) || 1;
  return { u: mu + (7.5 * sv) / mag, v: mv - (7.5 * su) / mag };
}
