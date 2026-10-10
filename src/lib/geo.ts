import type { Feature, FeatureCollection, Polygon, MultiPolygon, Position } from 'geojson';

function inRing(pt: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPolygon(pt: Position, rings: Position[][]): boolean {
  return rings.length > 0 && inRing(pt, rings[0]) && !rings.slice(1).some((h) => inRing(pt, h));
}
export function pointInFeature(pt: Position, f: Feature): boolean {
  const g = f.geometry as Polygon | MultiPolygon | null;
  if (!g) return false;
  if (g.type === 'Polygon') return inPolygon(pt, g.coordinates);
  if (g.type === 'MultiPolygon') return g.coordinates.some((p) => inPolygon(pt, p));
  return false;
}
/** Labels of all features in a collection containing the point. */
export function labelsAt(pt: Position, fc: FeatureCollection | null, key = 'LABEL'): string[] {
  return (fc?.features ?? []).filter((f) => pointInFeature(pt, f)).map((f) => String(f.properties?.[key]));
}
