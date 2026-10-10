import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { baseStyle, whirlColor, nwsColor, isCig } from './mapStyle';
import type { LayerId, LayerState } from '../lib/layers';
import { outsideUsMask, CONUS } from '../data/demo';

export interface MapViewProps {
  hotspots: FeatureCollection; spcCat: FeatureCollection | null; spcTorn: FeatureCollection | null; nws: FeatureCollection | null;
  layers: Record<LayerId, LayerState>; selectedId: string | null; onSelect: (id: string | null) => void;
  onReady?: (m: MLMap) => void; spin: boolean; marker: [number, number] | null;
}
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const LAYER_IDS: Record<LayerId, { id: string; prop: string; k: number }[]> = {
  whirl: [{ id: 'whirl-fill', prop: 'fill-opacity', k: 1 }, { id: 'whirl-line', prop: 'line-opacity', k: 1.6 }, { id: 'whirl-glow', prop: 'line-opacity', k: 1 }, { id: 'whirl-label', prop: 'text-opacity', k: 1.8 }],
  spcCat: [{ id: 'spccat-fill', prop: 'fill-opacity', k: 1 }, { id: 'spccat-line', prop: 'line-opacity', k: 2.4 }],
  spcTorn: [{ id: 'spctorn-fill', prop: 'fill-opacity', k: 1 }, { id: 'spctorn-line', prop: 'line-opacity', k: 2 }],
  nws: [{ id: 'nws-fill', prop: 'fill-opacity', k: 0.5 }, { id: 'nws-line', prop: 'line-opacity', k: 1.4 }],
};

export default function MapView(p: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const props = useRef(p); props.current = p;

  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!, style: baseStyle(true), center: [-98, 40], zoom: 1.7, minZoom: 1.2, maxZoom: 11,
      attributionControl: { compact: true }, maxPitch: 65,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    // NOTE: no GeolocateControl — location access is off by default by design.
    const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'hs-tip', offset: 12 });
    map.on('load', () => {
      ['spccat', 'spctorn', 'nws'].forEach((id) => map.addSource(id, { type: 'geojson', data: EMPTY }));
      map.addSource('whirl', { type: 'geojson', data: EMPTY, promoteId: 'id' });
      map.addSource('mask', { type: 'geojson', data: outsideUsMask() });
      map.addSource('conus', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: CONUS } } });
      map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#02040a', 'fill-opacity': 0.55 } });
      map.addLayer({ id: 'conus-line', type: 'line', source: 'conus', paint: { 'line-color': '#4fd1ff', 'line-opacity': 0.35, 'line-width': 1.2, 'line-blur': 1 } });
      map.addLayer({ id: 'spccat-fill', type: 'fill', source: 'spccat', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'spccat-line', type: 'line', source: 'spccat', paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.4 } });
      map.addLayer({ id: 'spctorn-fill', type: 'fill', source: 'spctorn', filter: ['!', isCig], paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.45 } });
      map.addLayer({ id: 'spctorn-line', type: 'line', source: 'spctorn', paint: { 'line-color': ['case', isCig, '#dddddd', ['get', 'stroke']], 'line-width': 1.6 } });
      map.addLayer({ id: 'nws-fill', type: 'fill', source: 'nws', paint: { 'fill-color': nwsColor, 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'nws-line', type: 'line', source: 'nws', paint: { 'line-color': nwsColor, 'line-width': 1.6 } });
      map.addLayer({ id: 'whirl-glow', type: 'line', source: 'whirl', paint: { 'line-color': whirlColor, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.5 } });
      map.addLayer({ id: 'whirl-fill', type: 'fill', source: 'whirl', paint: { 'fill-color': whirlColor, 'fill-opacity': 0.55 } });
      map.addLayer({ id: 'whirl-line', type: 'line', source: 'whirl', paint: { 'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', whirlColor], 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3.5, ['boolean', ['feature-state', 'hover'], false], 3, 1.8] } });
      map.addLayer({ id: 'whirl-label', type: 'symbol', source: 'whirl', minzoom: 3.2,
        layout: { 'text-field': ['concat', 'DEMO · ', ['to-string', ['get', 'score']]], 'text-size': 11, 'text-font': ['Open Sans Semibold'] },
        paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.4 } });
      let hovered: string | null = null;
      map.on('mousemove', 'whirl-fill', (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0]; if (!f) return;
        const id = String(f.properties?.id);
        if (hovered && hovered !== id) map.setFeatureState({ source: 'whirl', id: hovered }, { hover: false });
        hovered = id; map.setFeatureState({ source: 'whirl', id }, { hover: true });
        map.getCanvas().style.cursor = 'pointer';
        tip.setLngLat(e.lngLat).setHTML(`<b>${f.properties?.name}</b><br/>WHIRL-E <b>${f.properties?.score}</b> · ${f.properties?.category}<br/><span class="tip-demo">DEMO · tap for evidence</span>`).addTo(map);
      });
      map.on('mouseleave', 'whirl-fill', () => { if (hovered) map.setFeatureState({ source: 'whirl', id: hovered }, { hover: false }); hovered = null; map.getCanvas().style.cursor = ''; tip.remove(); });
      map.on('click', 'whirl-fill', (e: maplibregl.MapLayerMouseEvent) => { const id = e.features?.[0]?.properties?.id; if (id) { tip.remove(); props.current.onSelect(String(id)); } });
      ready.current = true;
      sync();
      props.current.onReady?.(map);
    });
    let raf = 0, t0 = performance.now();
    const frame = (now: number) => {
      if (ready.current) {
        const ph = (Math.sin((now - t0) / 520) + 1) / 2; // pulse 0..1
        const base = props.current.layers.whirl;
        if (base.visible) {
          map.setPaintProperty('whirl-glow', 'line-width', 6 + ph * 12);
          map.setPaintProperty('whirl-glow', 'line-opacity', base.opacity * (0.25 + 0.55 * ph));
          map.setPaintProperty('whirl-fill', 'fill-opacity', Math.min(1, base.opacity * (0.75 + 0.25 * ph)));
        }
        if (props.current.spin && !map.isMoving() && map.getZoom() < 2.4) { map.setCenter([map.getCenter().lng + 0.035, map.getCenter().lat]); t0 += 0; }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
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
        if (id !== 'whirl-glow' && id !== 'whirl-fill') map.setPaintProperty(id, prop as 'fill-opacity', Math.min(1, st.opacity * k));
      });
    });
    c.hotspots.features.forEach((f) => map.setFeatureState({ source: 'whirl', id: f.id as string }, { selected: f.id === c.selectedId }));
  };
  useEffect(sync, [p.hotspots, p.spcCat, p.spcTorn, p.nws, p.layers, p.selectedId]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    markerRef.current?.remove(); markerRef.current = null;
    if (p.marker) {
      const d = document.createElement('div'); d.className = 'target-marker'; d.innerHTML = '<span></span>';
      markerRef.current = new maplibregl.Marker({ element: d }).setLngLat(p.marker).addTo(map);
    }
  }, [p.marker]);

  return <div ref={el} className="map" data-testid="map" />;
}
