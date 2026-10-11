/**
 * LIVE official/real-time data helpers (no demo content here).
 * Sources (all CORS-enabled as of Oct 2026):
 *  - RainViewer public radar API (composite reflectivity mosaic tiles)
 *  - NWS mapservices WWA (watch/warning polygons incl. zone-based watches)
 *  - api.weather.gov alerts (counts, headline/description)
 *  - SPC outlook GeoJSON (Day 1 cat/torn/sigtorn, Day 2/3 cat)
 *  - NWS mapservices SPC Mesoscale Discussions
 *  - NWS mapservices NHC tropical weather (forecast cone/track)
 */
import type { Feature, FeatureCollection } from 'geojson';

export const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
export const RADAR_REFRESH_MS = 5 * 60_000;
export const RADAR_MAX_ZOOM = 7; // RainViewer free tiles are limited to z ≤ 7
export const RADAR_COLOR = 4; // The Weather Channel-style palette
export const SPC_D1_SIGTORN = 'https://www.spc.noaa.gov/products/outlook/day1otlk_sigtorn.lyr.geojson';
export const SPC_D2_CAT = 'https://www.spc.noaa.gov/products/outlook/day2otlk_cat.lyr.geojson';
export const SPC_D3_CAT = 'https://www.spc.noaa.gov/products/outlook/day3otlk_cat.lyr.geojson';
export const SPC_MD_URL = 'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/spc_mesoscale_discussion/MapServer/0/query?where=1%3D1&outFields=*&f=geojson';
export const NHC_MAPSERVER = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';
export const WWA_TYPES = ['Tornado Warning', 'Tornado Watch', 'Severe Thunderstorm Warning', 'Severe Thunderstorm Watch',
  'Hurricane Warning', 'Hurricane Watch', 'Tropical Storm Warning', 'Tropical Storm Watch', 'Flash Flood Warning'] as const;
export const ALERT_COUNT_URL = `https://api.weather.gov/alerts/active?status=actual&event=${encodeURIComponent('Tornado Warning,Tornado Watch,Severe Thunderstorm Warning,Hurricane Warning,Tropical Storm Warning')}`;

export function wwaUrl(types: readonly string[] = WWA_TYPES): string {
  const where = `prod_type IN (${types.map((t) => `'${t.replace(/'/g, "''")}'`).join(',')})`;
  return `https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query?where=${encodeURIComponent(where)}&outFields=prod_type,expiration,issuance,url,wfo,sig&f=geojson`;
}

export interface RadarFrame { time: number; url: string }
interface RVJson { host?: string; radar?: { past?: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] } }
/** Parse RainViewer weather-maps.json into tile URL templates (past frames, oldest → newest). */
export function rainviewerFrames(j: unknown, color = RADAR_COLOR): RadarFrame[] {
  const r = j as RVJson;
  if (!r?.host || !/^https:\/\//.test(r.host) || !Array.isArray(r.radar?.past)) return [];
  return r.radar!.past!.filter((f) => typeof f.time === 'number' && typeof f.path === 'string' && /^\/[\w/]+$/.test(f.path))
    .sort((a, b) => a.time - b.time)
    .map((f) => ({ time: f.time, url: `${r.host}${f.path}/256/{z}/{x}/{y}/${color}/1_1.png` }));
}

export interface LiveSummary {
  tornadoWarnings: number; tornadoWatches: number; severeWarnings: number; tropicalWarnings: number;
  maxTornPct: number; conditionalIntensity: string | null; sigHatched: boolean; mds: number;
  tornadoAreas: string[];
}
/** Summarize api.weather.gov alerts + SPC torn/sigtorn + MDs. */
export function liveSummary(alerts: FeatureCollection | null, torn: FeatureCollection | null, sigtorn: FeatureCollection | null, md: FeatureCollection | null): LiveSummary {
  const ev = (f: Feature) => String(f.properties?.event ?? '');
  const fs = alerts?.features ?? [];
  const tornLabels = (torn?.features ?? []).map((f) => String(f.properties?.LABEL ?? ''));
  const pct = tornLabels.filter((l) => /^0?\.\d+$/.test(l)).map(Number).reduce((a, b) => Math.max(a, b), 0);
  const cig = tornLabels.filter((l) => l.startsWith('CIG')).sort().pop() ?? null;
  const sig = (sigtorn?.features ?? []).some((f) => f.geometry && ((f.geometry as { coordinates?: unknown[]; geometries?: unknown[] }).coordinates?.length ?? (f.geometry as { geometries?: unknown[] }).geometries?.length ?? 0) > 0);
  return {
    tornadoWarnings: fs.filter((f) => ev(f) === 'Tornado Warning').length,
    tornadoWatches: fs.filter((f) => ev(f) === 'Tornado Watch').length,
    severeWarnings: fs.filter((f) => ev(f) === 'Severe Thunderstorm Warning').length,
    tropicalWarnings: fs.filter((f) => /^(Hurricane|Tropical Storm) Warning$/.test(ev(f))).length,
    maxTornPct: Math.round(pct * 100), conditionalIntensity: cig, sigHatched: sig || !!cig,
    mds: md?.features?.length ?? 0,
    tornadoAreas: fs.filter((f) => ev(f).startsWith('Tornado')).map((f) => `${ev(f)}: ${String(f.properties?.areaDesc ?? '')}`),
  };
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Tap-popup HTML for a WWA polygon (+ optional api.weather.gov details). All text escaped. */
export function alertPopupHtml(p: Record<string, unknown>, detail?: { headline?: string; description?: string } | null, fmt: (iso: string) => string = (s) => s): string {
  const type = escapeHtml(String(p.prod_type ?? p.event ?? 'Alert'));
  const exp = p.expiration ?? p.expires;
  const lines = [`<b class="pp-type">${type}</b>`];
  if (exp) lines.push(`<div class="pp-exp">Expires ${escapeHtml(fmt(String(exp)))}</div>`);
  if (detail?.headline) lines.push(`<div class="pp-head">${escapeHtml(detail.headline)}</div>`);
  if (detail?.description) lines.push(`<div class="pp-desc">${escapeHtml(detail.description.slice(0, 600))}${detail.description.length > 600 ? '…' : ''}</div>`);
  else if (detail === undefined) lines.push('<div class="pp-desc muted">Loading details…</div>');
  lines.push('<div class="pp-src">Source: NWS · official</div>');
  return lines.join('');
}

/** NHC layer ids to query (forecast cone + forecast track for every active-storm bin). */
export function nhcLayerIds(mapserverJson: unknown): number[] {
  const ls = (mapserverJson as { layers?: { id: number; name: string }[] })?.layers ?? [];
  return ls.filter((l) => /^(AT|EP|CP)\d (Forecast Cone|Forecast Track|Forecast Points)$/.test(l.name)).map((l) => l.id);
}

/** The MD service returns a placeholder feature named "NoArea" when nothing is active. */
export function activeMds(fc: FeatureCollection | null): FeatureCollection | null {
  if (!fc) return null;
  return { type: 'FeatureCollection', features: (fc.features ?? []).filter((f) => f.geometry && String(f.properties?.name ?? '') !== 'NoArea') };
}
