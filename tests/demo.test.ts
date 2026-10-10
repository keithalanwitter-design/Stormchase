import { describe, it, expect } from 'vitest';
import { demoHotspots, hotspotDetail, HOTSPOT_DEFS, ellipse, validTime, MODELS, whirlSeries, dayLabel, CONUS, MAX_FHR, outsideUsMask } from '../src/data/demo';
import { pointInFeature } from '../src/lib/geo';
import { searchPlaces, LAYER_META, DEFAULT_LAYERS } from '../src/lib/layers';

const conusFeature = { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [CONUS] } };

describe('demo hotspots', () => {
  it('5–7 hotspots, all centered inside the CONUS outline (US-only area of operations)', () => {
    expect(HOTSPOT_DEFS.length).toBeGreaterThanOrEqual(5); expect(HOTSPOT_DEFS.length).toBeLessThanOrEqual(7);
    for (const d of HOTSPOT_DEFS) { expect(pointInFeature(d.center, conusFeature)).toBe(true); expect(pointInFeature(d.chase.targetLonLat, conusFeature)).toBe(true); }
  });
  it('cover Plains, Midwest, Illinois and Dixie', () => { expect(new Set(HOTSPOT_DEFS.map((d) => d.region))).toEqual(new Set(['Plains', 'Midwest', 'Illinois', 'Dixie'])); });
  it('are always flagged demo and are closed polygons', () => {
    for (const f of demoHotspots('HRRR', 57).features) {
      expect(f.properties.demo).toBe(true);
      const ring = f.geometry.coordinates[0]; expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });
  it('storyline moves east: Plains on Day 2, Dixie on Day 0', () => {
    const ids = (f: number) => demoHotspots('HRRR', f).features.map((x) => x.id);
    expect(ids(33)).toContain('hs-ksok'); expect(ids(33)).not.toContain('hs-dixie');
    expect(ids(78)).toContain('hs-dixie'); expect(ids(78)).not.toContain('hs-ksok');
    expect(ids(0)).toHaveLength(0);
  });
  it('hotspots grow toward the peak', () => {
    const area = (f: number) => { const g = demoHotspots('HRRR', f).features.find((x) => x.id === 'hs-ozark'); return g ? Math.abs(g.geometry.coordinates[0][16][0] - g.geometry.coordinates[0][48][0]) : 0; };
    expect(area(57)).toBeGreaterThan(area(50));
  });
  it('series peaks near peakFhr and spans the full timeline', () => {
    const s = whirlSeries(HOTSPOT_DEFS[0], 'HRRR');
    expect(s).toHaveLength(MAX_FHR + 1);
    const best = s.reduce((a, b) => (b.score > a.score ? b : a)); expect(Math.abs(best.fhr - HOTSPOT_DEFS[0].peakFhr)).toBeLessThanOrEqual(2);
  });
  it('model disagreement and three indices per model', () => {
    const d = hotspotDetail(HOTSPOT_DEFS[2], 'HRRR', 57);
    expect(d.perModel).toHaveLength(MODELS.length); expect(d.spreadPct).toBeGreaterThan(0);
    expect(d.perModel[0]).toHaveProperty('stci'); expect(d.perModel[0]).toHaveProperty('stp');
  });
  it('the hail-trap hotspot scores lower than the classic Plains hotspot', () => {
    const a = hotspotDetail(HOTSPOT_DEFS.find((x) => x.id === 'hs-ksok')!, 'HRRR', 33).scores.whirl.score;
    const b = hotspotDetail(HOTSPOT_DEFS.find((x) => x.id === 'hs-redriver')!, 'HRRR', 33).scores.whirl.score;
    expect(a).toBeGreaterThan(b * 2);
  });
  it('ellipse stays near center', () => {
    for (const [lon, lat] of ellipse([-90, 40], [100, 50], 0).coordinates[0]) { expect(Math.abs(lon + 90)).toBeLessThan(1.5); expect(Math.abs(lat - 40)).toBeLessThan(1); }
  });
  it('time labels', () => {
    expect(validTime(6).toISOString()).toBe('2027-04-24T18:00:00.000Z');
    expect(dayLabel(0)).toBe('Day 3'); expect(dayLabel(33)).toBe('Day 2'); expect(dayLabel(57)).toBe('Day 1'); expect(dayLabel(80)).toBe('Day 0');
  });
  it('mask dims outside the US, not inside', () => {
    const m = outsideUsMask();
    expect(pointInFeature([-89, 40], m)).toBe(false); expect(pointInFeature([-100, 55], m)).toBe(true); expect(pointInFeature([-100, 22], m)).toBe(true);
  });
});

describe('layers', () => {
  it('search is local and case-insensitive', () => { expect(searchPlaces('peoria')[0].name).toBe('Peoria, IL'); expect(searchPlaces('')).toEqual([]); });
  it('only the WHIRL layer is demo', () => { expect(LAYER_META.filter((l) => l.demo).map((l) => l.id)).toEqual(['whirl']); expect(Object.keys(DEFAULT_LAYERS)).toHaveLength(4); });
});
import { peakHotspots } from '../src/data/demo';
describe('peakHotspots', () => { it('shows every corridor once', () => { expect(peakHotspots('HRRR').features.map((f) => f.id).sort()).toEqual(HOTSPOT_DEFS.map((d) => d.id).sort()); }); });
