import { describe, it, expect } from 'vitest';
import { rainviewerFrames, liveSummary, alertPopupHtml, escapeHtml, wwaUrl, nhcLayerIds } from '../src/lib/live';
import type { FeatureCollection } from 'geojson';
const fc = (features: { properties: Record<string, unknown>; geometry?: unknown }[]): FeatureCollection => ({ type: 'FeatureCollection', features: features.map((f) => ({ type: 'Feature', geometry: (f.geometry ?? null) as never, properties: f.properties })) });

describe('RainViewer frames', () => {
  it('builds sorted tile templates and rejects bad input', () => {
    const fr = rainviewerFrames({ host: 'https://tilecache.rainviewer.com', radar: { past: [{ time: 20, path: '/v2/radar/b' }, { time: 10, path: '/v2/radar/a' }, { time: 30, path: '/../evil"' }] } });
    expect(fr.map((f) => f.time)).toEqual([10, 20]);
    expect(fr[0].url).toBe('https://tilecache.rainviewer.com/v2/radar/a/256/{z}/{x}/{y}/4/1_1.png');
    expect(rainviewerFrames({ host: 'http://x', radar: { past: [] } })).toEqual([]);
    expect(rainviewerFrames(null)).toEqual([]);
  });
});
describe('live summary', () => {
  it('counts tornado products and reads SPC torn %, CIG and MDs', () => {
    const alerts = fc([{ properties: { event: 'Tornado Warning', areaDesc: 'Dorchester, SC' } }, { properties: { event: 'Tornado Watch', areaDesc: 'X' } }, { properties: { event: 'Tornado Watch', areaDesc: 'Y' } }, { properties: { event: 'Hurricane Warning' } }]);
    const torn = fc([{ properties: { LABEL: '0.02' } }, { properties: { LABEL: '0.05' } }, { properties: { LABEL: 'CIG1' } }]);
    const s = liveSummary(alerts, torn, fc([{ properties: {}, geometry: { type: 'GeometryCollection', geometries: [] } }]), fc([{ properties: { name: 'MD 2359' } }]));
    expect(s).toMatchObject({ tornadoWarnings: 1, tornadoWatches: 2, tropicalWarnings: 1, maxTornPct: 5, conditionalIntensity: 'CIG1', sigHatched: true, mds: 1 });
    expect(s.tornadoAreas[0]).toContain('Dorchester');
  });
  it('handles empty/missing data', () => { expect(liveSummary(null, null, null, null)).toMatchObject({ tornadoWarnings: 0, maxTornPct: 0, sigHatched: false, mds: 0 }); });
});
describe('popups + urls', () => {
  it('escapes all untrusted text', () => {
    const h = alertPopupHtml({ prod_type: '<img onerror=x>', expiration: '2026' }, { headline: 'a<b', description: '"x"' });
    expect(h).not.toContain('<img'); expect(h).toContain('&lt;img'); expect(h).toContain('a&lt;b'); expect(escapeHtml(`'`)).toBe('&#39;');
  });
  it('WWA query url encodes types', () => { expect(decodeURIComponent(wwaUrl(['Tornado Watch']))).toContain("prod_type IN ('Tornado Watch')"); });
  it('picks NHC cone/track layers', () => {
    expect(nhcLayerIds({ layers: [{ id: 8, name: 'AT1 Forecast Cone' }, { id: 7, name: 'AT1 Forecast Track' }, { id: 9, name: 'AT1 Watch-Warning' }, { id: 86, name: 'AT4 Forecast Cone' }] })).toEqual([8, 7, 86]);
  });
});
import { activeMds } from '../src/lib/live';
describe('activeMds', () => { it('drops NoArea placeholder', () => {
  const r = activeMds(fc([{ properties: { name: 'NoArea' }, geometry: { type: 'Point', coordinates: [0, 0] } }, { properties: { name: 'MD 2360' }, geometry: { type: 'Point', coordinates: [0, 0] } }]))!;
  expect(r.features.map((f) => f.properties?.name)).toEqual(['MD 2360']); expect(activeMds(null)).toBeNull(); }); });
