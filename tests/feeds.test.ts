import { describe, it, expect, vi } from 'vitest';
import { fetchGeoJSON, toProxyPath, highestCategory, spcTimes, filterSevereAlerts, SPC_CAT_URL } from '../src/lib/feeds';
import type { FeatureCollection } from 'geojson';

const fc = (labels: string[]): FeatureCollection => ({ type: 'FeatureCollection', features: labels.map((l) => ({ type: 'Feature', geometry: null as never, properties: { LABEL: l, ISSUE_ISO: '2026-10-10T20:00:00+00:00', VALID_ISO: 'v', EXPIRE_ISO: 'e', FORECASTER: 'X' } })) });
const resp = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body, headers: new Headers({ 'last-modified': 'Sat, 10 Oct 2026 20:04:06 GMT' }) }) as unknown as Response;

describe('feeds', () => {
  it('maps proxy paths', () => {
    expect(toProxyPath(SPC_CAT_URL)).toBe('/proxy/spc/products/outlook/day1otlk_cat.lyr.geojson');
    expect(toProxyPath('https://api.weather.gov/alerts/active?x=1')).toBe('/proxy/nws/alerts/active?x=1');
  });
  it('direct success', async () => {
    const r = await fetchGeoJSON(SPC_CAT_URL, vi.fn().mockResolvedValue(resp(fc(['TSTM']))));
    expect(r.via).toBe('direct'); expect(r.error).toBeNull(); expect(r.lastModified).toContain('2026');
  });
  it('falls back to proxy', async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(resp(fc(['MRGL'])));
    const r = await fetchGeoJSON(SPC_CAT_URL, f);
    expect(r.via).toBe('proxy'); expect(f).toHaveBeenLastCalledWith('/proxy/spc/products/outlook/day1otlk_cat.lyr.geojson', expect.anything());
  });
  it('graceful error, never throws', async () => {
    const r = await fetchGeoJSON(SPC_CAT_URL, vi.fn().mockResolvedValue(resp({}, false, 503)));
    expect(r.data).toBeNull(); expect(r.error).toMatch(/503/); expect(r.via).toBe('none');
  });
  it('rejects non-FeatureCollection payloads', async () => {
    const r = await fetchGeoJSON(SPC_CAT_URL, vi.fn().mockResolvedValue(resp({ hello: 1 })));
    expect(r.error).toMatch(/FeatureCollection/);
  });
  it('highest category + times', () => {
    expect(highestCategory(fc(['TSTM', 'SLGT', 'MRGL']))).toBe('SLGT');
    expect(highestCategory(fc([]))).toBeNull();
    expect(spcTimes(fc(['TSTM']))?.issue).toBe('2026-10-10T20:00:00+00:00');
  });
  it('filters severe alerts with geometry', () => {
    const a: FeatureCollection = { type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { event: 'Tornado Warning' } },
      { type: 'Feature', geometry: null as never, properties: { event: 'Tornado Warning' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { event: 'Frost Advisory' } }] };
    expect(filterSevereAlerts(a).features).toHaveLength(1);
  });
});
