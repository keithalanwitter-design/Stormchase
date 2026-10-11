import { describe, it, expect } from 'vitest';
import { TOUR_STEPS } from '../src/lib/tour';
import { HOTSPOT_DEFS, MAX_FHR, CONUS } from '../src/data/demo';
import { pointInFeature } from '../src/lib/geo';
const conus = { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [CONUS] } };
describe('demo tour', () => {
  it('has night-before → morning → firing → decision → wrap', () => { expect(TOUR_STEPS.map((s) => s.id)).toEqual(['day2', 'morning', 'firing', 'decision', 'wrap']); });
  it('references real hotspots, valid hours, US cameras', () => {
    for (const s of TOUR_STEPS) {
      if (s.select) expect(HOTSPOT_DEFS.some((h) => h.id === s.select)).toBe(true);
      expect(s.fhr).toBeGreaterThanOrEqual(0); expect(s.fhr).toBeLessThanOrEqual(MAX_FHR);
      expect(pointInFeature(s.camera.center, conus)).toBe(true);
    }
  });
});
