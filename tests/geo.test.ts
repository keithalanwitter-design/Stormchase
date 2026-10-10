import { describe, it, expect } from 'vitest';
import { pointInFeature, labelsAt } from '../src/lib/geo';
import type { FeatureCollection } from 'geojson';
const sq = (x: number, label: string) => ({ type: 'Feature' as const, properties: { LABEL: label }, geometry: { type: 'Polygon' as const, coordinates: [[[x, 0], [x + 10, 0], [x + 10, 10], [x, 10], [x, 0]]] } });
describe('geo', () => {
  it('point in polygon', () => { expect(pointInFeature([5, 5], sq(0, 'A'))).toBe(true); expect(pointInFeature([15, 5], sq(0, 'A'))).toBe(false); });
  it('holes and multipolygons', () => {
    const holed = { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] } };
    expect(pointInFeature([5, 5], holed)).toBe(false);
    const fc: FeatureCollection = { type: 'FeatureCollection', features: [sq(0, 'TSTM'), sq(-5, 'MRGL'), sq(50, 'SLGT')] };
    expect(labelsAt([2, 2], fc)).toEqual(['TSTM', 'MRGL']);
  });
});
