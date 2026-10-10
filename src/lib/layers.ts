export type LayerId = 'whirl' | 'spcCat' | 'spcTorn' | 'nws';
export interface LayerState { visible: boolean; opacity: number }
export interface LayerMeta { id: LayerId; name: string; source: string; demo: boolean; legend: { color: string; label: string }[] }

export const LAYER_META: LayerMeta[] = [
  { id: 'whirl', name: 'WHIRL-E hotspots', source: 'Synthetic demo dataset', demo: true, legend: [
    { color: '#f7c948', label: '<1 low-odds' }, { color: '#ff7a1a', label: '1–3 chaseable' }, { color: '#ff2d6f', label: '3+ high-end' }] },
  { id: 'spcCat', name: 'SPC Day 1 categorical', source: 'NOAA/NWS Storm Prediction Center', demo: false, legend: [
    { color: '#C1E9C1', label: 'TSTM' }, { color: '#66A366', label: 'MRGL' }, { color: '#FFE066', label: 'SLGT' },
    { color: '#FFA366', label: 'ENH' }, { color: '#E06666', label: 'MDT' }, { color: '#EE99EE', label: 'HIGH' }] },
  { id: 'spcTorn', name: 'SPC Day 1 tornado prob.', source: 'NOAA/NWS Storm Prediction Center', demo: false, legend: [
    { color: '#79BA7A', label: '2%' }, { color: '#BD998A', label: '5%' }, { color: '#FFE066', label: '10%' },
    { color: '#E06666', label: '15%' }, { color: '#EE99EE', label: '30%+' }, { color: '#888888', label: 'CIG (hatched)' }] },
  { id: 'nws', name: 'NWS active warnings', source: 'api.weather.gov/alerts/active', demo: false, legend: [
    { color: '#ff1f3d', label: 'Tornado Warning' }, { color: '#ffb000', label: 'Severe T-storm Warning' },
    { color: '#ffff55', label: 'Tornado Watch' }, { color: '#db7093', label: 'Svr T-storm Watch' }, { color: '#2ee86b', label: 'Flash Flood Warning' }] },
];

export const DEFAULT_LAYERS: Record<LayerId, LayerState> = {
  whirl: { visible: true, opacity: 0.55 }, spcCat: { visible: true, opacity: 0.35 }, spcTorn: { visible: false, opacity: 0.45 }, nws: { visible: true, opacity: 0.7 },
};

/** Minimal offline gazetteer for location search — no geolocation, no third-party geocoder. */
export const PLACES: { name: string; lon: number; lat: number }[] = [
  { name: 'Springfield, IL', lon: -89.65, lat: 39.8 }, { name: 'Peoria, IL', lon: -89.59, lat: 40.69 }, { name: 'Champaign, IL', lon: -88.24, lat: 40.12 },
  { name: 'St. Louis, MO', lon: -90.2, lat: 38.63 }, { name: 'Springfield, MO', lon: -93.29, lat: 37.21 }, { name: 'Joplin, MO', lon: -94.51, lat: 37.08 },
  { name: 'Indianapolis, IN', lon: -86.16, lat: 39.77 }, { name: 'Norman, OK', lon: -97.44, lat: 35.22 }, { name: 'Oklahoma City, OK', lon: -97.52, lat: 35.47 },
  { name: 'Wichita Falls, TX', lon: -98.49, lat: 33.91 }, { name: 'Dodge City, KS', lon: -100.02, lat: 37.75 }, { name: 'Wichita, KS', lon: -97.34, lat: 37.69 },
  { name: 'Omaha, NE', lon: -95.93, lat: 41.26 }, { name: 'Des Moines, IA', lon: -93.62, lat: 41.59 }, { name: 'Jackson, MS', lon: -90.18, lat: 32.3 },
  { name: 'Birmingham, AL', lon: -86.8, lat: 33.52 }, { name: 'Memphis, TN', lon: -90.05, lat: 35.15 }, { name: 'Chicago, IL', lon: -87.63, lat: 41.88 },
];
export function searchPlaces(q: string, limit = 6) {
  const s = q.trim().toLowerCase();
  return s ? PLACES.filter((p) => p.name.toLowerCase().includes(s)).slice(0, limit) : [];
}
