import { describe, it, expect } from 'vitest';
import { demoHotspots, hotspotDetail, HOTSPOT_DEFS, ellipse, validTime, MODELS } from '../src/data/demo';

describe('demo hotspots', () => {
  it('are always flagged demo and are closed polygons', () => {
    const fc = demoHotspots('HRRR', 10);
    expect(fc.features.length).toBeGreaterThan(0);
    for (const f of fc.features) {
      expect(f.properties.demo).toBe(true);
      expect(f.geometry.type).toBe('Polygon');
      const ring = f.geometry.coordinates[0];
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });
  it('vanish far from the peak window', () => { expect(demoHotspots('HRRR', 48).features).toHaveLength(0); });
  it('model disagreement produces a spread', () => {
    const d = hotspotDetail(HOTSPOT_DEFS[0], 'HRRR', 10);
    expect(d.perModel).toHaveLength(MODELS.length); expect(d.spreadPct).toBeGreaterThan(0);
  });
  it('ellipse stays near center', () => {
    const p = ellipse([-90, 40], [100, 50], 0);
    for (const [lon, lat] of p.coordinates[0]) { expect(Math.abs(lon + 90)).toBeLessThan(1.5); expect(Math.abs(lat - 40)).toBeLessThan(1); }
  });
  it('valid time = init + fhr', () => { expect(validTime(6).toISOString()).toBe('2027-04-27T18:00:00.000Z'); });
});

import { searchPlaces, LAYER_META, DEFAULT_LAYERS } from '../src/lib/layers';
describe('layers', () => {
  it('search is local and case-insensitive', () => { expect(searchPlaces('peoria')[0].name).toBe('Peoria, IL'); expect(searchPlaces('')).toEqual([]); });
  it('only the WHIRL layer is demo', () => { expect(LAYER_META.filter((l) => l.demo).map((l) => l.id)).toEqual(['whirl']); expect(Object.keys(DEFAULT_LAYERS)).toHaveLength(4); });
});
