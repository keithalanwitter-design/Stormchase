import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { baseStyle, whirlColor, nwsColor, isCig } from './mapStyle';
import type { LayerId, LayerState } from '../lib/layers';

export interface MapViewProps {
  hotspots: FeatureCollection; spcCat: FeatureCollection | null; spcTorn: FeatureCollection | null; nws: FeatureCollection | null;
  layers: Record<LayerId, LayerState>; selectedId: string | null; onSelect: (id: string | null) => void;
  onReady?: (m: MLMap) => void; landing: boolean;
}
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const LAYER_IDS: Record<LayerId, { id: string; prop: string; k: number }[]> = {
  whirl: [{ id: 'whirl-fill', prop: 'fill-opacity', k: 1 }, { id: 'whirl-line', prop: 'line-opacity', k: 1.6 }, { id: 'whirl-label', prop: 'text-opacity', k: 1.8 }],
  spcCat: [{ id: 'spccat-fill', prop: 'fill-opacity', k: 1 }, { id: 'spccat-line', prop: 'line-opacity', k: 2.4 }],
  spcTorn: [{ id: 'spctorn-fill', prop: 'fill-opacity', k: 1 }, { id: 'spctorn-line', prop: 'line-opacity', k: 2 }],
  nws: [{ id: 'nws-fill', prop: 'fill-opacity', k: 0.5 }, { id: 'nws-line', prop: 'line-opacity', k: 1.4 }],
};

export default function MapView(p: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const props = useRef(p); props.current = p;

  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!, style: baseStyle(true), center: [-60, 28], zoom: 1.35, minZoom: 0.8, maxZoom: 11,
      attributionControl: { compact: true }, maxPitch: 60,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    // NOTE: no GeolocateControl — location access is off by default by design.
    map.on('load', () => {
      const add = (id: string) => map.addSource(id, { type: 'geojson', data: EMPTY, promoteId: 'id' });
      ['spccat', 'spctorn', 'nws', 'whirl'].forEach(add);
      map.addLayer({ id: 'spccat-fill', type: 'fill', source: 'spccat', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'spccat-line', type: 'line', source: 'spccat', paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.4 } });
      map.addLayer({ id: 'spctorn-fill', type: 'fill', source: 'spctorn', filter: ['!', isCig], paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.45 } });
      map.addLayer({ id: 'spctorn-line', type: 'line', source: 'spctorn', paint: { 'line-color': ['case', isCig, '#dddddd', ['get', 'stroke']], 'line-width': 1.6, 'line-dasharray': ['case', isCig, ['literal', [2, 2]], ['literal', [1, 0]]] } });
      map.addLayer({ id: 'nws-fill', type: 'fill', source: 'nws', paint: { 'fill-color': nwsColor, 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'nws-line', type: 'line', source: 'nws', paint: { 'line-color': nwsColor, 'line-width': 1.6 } });
      map.addLayer({ id: 'whirl-fill', type: 'fill', source: 'whirl', paint: { 'fill-color': whirlColor, 'fill-opacity': 0.55 } });
      map.addLayer({ id: 'whirl-line', type: 'line', source: 'whirl', paint: { 'line-color': whirlColor, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 2], 'line-blur': 0.5 } });
      map.addLayer({ id: 'whirl-label', type: 'symbol', source: 'whirl', minzoom: 3,
        layout: { 'text-field': ['concat', 'DEMO · WHIRL-E ', ['to-string', ['get', 'score']]], 'text-size': 11, 'text-font': ['Open Sans Semibold'] },
        paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.4 } });
      map.on('click', 'whirl-fill', (e: maplibregl.MapLayerMouseEvent) => { const id = e.features?.[0]?.properties?.id; if (id) props.current.onSelect(String(id)); });
      map.on('mouseenter', 'whirl-fill', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'whirl-fill', () => (map.getCanvas().style.cursor = ''));
      ready.current = true;
      sync();
      props.current.onReady?.(map);
    });
    // Slow cinematic spin while on the landing globe
    let raf = 0;
    const spin = () => {
      if (props.current.landing && !map.isMoving() && map.getZoom() < 2.2) map.setCenter([map.getCenter().lng + 0.06, map.getCenter().lat]);
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => { cancelAnimationFrame(raf); ready.current = false; map.remove(); };
  }, []);

  const sync = () => {
    const map = mapRef.current; const c = props.current;
    if (!map || !ready.current) return;
    (map.getSource('whirl') as GeoJSONSource).setData(c.hotspots);
    (map.getSource('spccat') as GeoJSONSource).setData(c.spcCat ?? EMPTY);
    (map.getSource('spctorn') as GeoJSONSource).setData(c.spcTorn ?? EMPTY);
    (map.getSource('nws') as GeoJSONSource).setData(c.nws ?? EMPTY);
    (Object.keys(LAYER_IDS) as LayerId[]).forEach((lid) => {
      const st = c.layers[lid];
      LAYER_IDS[lid].forEach(({ id, prop, k }) => {
        map.setLayoutProperty(id, 'visibility', st.visible ? 'visible' : 'none');
        map.setPaintProperty(id, prop as 'fill-opacity', Math.min(1, st.opacity * k));
      });
    });
    c.hotspots.features.forEach((f) => map.setFeatureState({ source: 'whirl', id: f.id as string }, { selected: f.id === c.selectedId }));
  };
  useEffect(sync, [p.hotspots, p.spcCat, p.spcTorn, p.nws, p.layers, p.selectedId]);

  return <div ref={el} className="map" data-testid="map" />;
}
