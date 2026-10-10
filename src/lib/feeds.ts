import type { FeatureCollection } from 'geojson';

export const SPC_CAT_URL = 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson';
export const SPC_TORN_URL = 'https://www.spc.noaa.gov/products/outlook/day1otlk_torn.lyr.geojson';
export const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update';

export interface FeedResult<T = FeatureCollection> {
  data: T | null; fetchedAt: Date; lastModified: string | null; error: string | null; via: 'direct' | 'proxy' | 'none';
}

/** Map an absolute upstream URL to the same-origin dev/preview proxy path. */
export function toProxyPath(url: string): string {
  const u = new URL(url);
  if (u.host === 'www.spc.noaa.gov') return `/proxy/spc${u.pathname}${u.search}`;
  if (u.host === 'api.weather.gov') return `/proxy/nws${u.pathname}${u.search}`;
  throw new Error(`No proxy route for ${u.host}`);
}

/** Fetch GeoJSON directly; on network/CORS failure retry via proxy. Never throws. */
export async function fetchGeoJSON(url: string, fetcher: typeof fetch = fetch): Promise<FeedResult> {
  const attempt = async (target: string) => {
    const res = await fetcher(target, { headers: { Accept: 'application/geo+json, application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as FeatureCollection;
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Unexpected payload (not a FeatureCollection)');
    return { data, lastModified: res.headers.get('last-modified') };
  };
  try {
    const r = await attempt(url);
    return { ...r, fetchedAt: new Date(), error: null, via: 'direct' };
  } catch (e1) {
    try {
      const r = await attempt(toProxyPath(url));
      return { ...r, fetchedAt: new Date(), error: null, via: 'proxy' };
    } catch (e2) {
      return { data: null, fetchedAt: new Date(), lastModified: null, via: 'none',
        error: `${(e1 as Error).message}; proxy: ${(e2 as Error).message}` };
    }
  }
}

/** SPC issue/valid times from feature properties (ISSUE_ISO etc.). */
export function spcTimes(fc: FeatureCollection | null) {
  const p = fc?.features?.[0]?.properties as Record<string, string> | undefined;
  return p ? { issue: p.ISSUE_ISO ?? null, valid: p.VALID_ISO ?? null, expire: p.EXPIRE_ISO ?? null, forecaster: p.FORECASTER ?? null } : null;
}

const CAT_ORDER = ['TSTM', 'MRGL', 'SLGT', 'ENH', 'MDT', 'HIGH'];
/** Highest categorical risk label present, or null. */
export function highestCategory(fc: FeatureCollection | null): string | null {
  let best = -1;
  for (const f of fc?.features ?? []) best = Math.max(best, CAT_ORDER.indexOf(String(f.properties?.LABEL)));
  return best >= 0 ? CAT_ORDER[best] : null;
}

export function fmtTime(iso: string | Date | null | undefined, tz = 'America/Chicago'): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

/** Keep only tornado/severe-relevant NWS alert events with geometry. */
export const SEVERE_EVENTS = ['Tornado Warning', 'Severe Thunderstorm Warning', 'Tornado Watch', 'Severe Thunderstorm Watch', 'Flash Flood Warning', 'Special Weather Statement'];
export function filterSevereAlerts(fc: FeatureCollection | null): FeatureCollection {
  return { type: 'FeatureCollection', features: (fc?.features ?? []).filter((f) => f.geometry && SEVERE_EVENTS.includes(String(f.properties?.event))) };
}
