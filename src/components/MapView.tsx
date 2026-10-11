import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { baseStyle, whirlColor, nwsColor, isCig } from './mapStyle';
import type { LayerId, LayerState } from '../lib/layers';
import { outsideUsMask, CONUS } from '../data/demo';
import { alertPopupHtml, RADAR_MAX_ZOOM, type RadarFrame } from '../lib/live';
import { fmtTime } from '../lib/feeds';

export interface MapViewProps {
  hotspots: FeatureCollection; spcCat: FeatureCollection | null; spcTorn: FeatureCollection | null; nws: FeatureCollection | null;
  layers: Record<LayerId, LayerState>; selectedId: string | null; onSelect: (id: string | null) => void;
  onReady?: (m: MLMap) => void; spin: boolean; marker: [number, number] | null;
  sigtorn: FeatureCollection | null; spcD2: FeatureCollection | null; spcD3: FeatureCollection | null; md: FeatureCollection | null; nhc: FeatureCollection | null;
  radarFrames: RadarFrame[]; radarIndex: number;
}
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const LAYER_IDS: Record<LayerId, { id: string; prop: string; k: number }[]> = {
  whirl: [{ id: 'whirl-fill', prop: 'fill-opacity', k: 1 }, { id: 'whirl-line', prop: 'line-opacity', k: 1.6 }, { id: 'whirl-glow', prop: 'line-opacity', k: 1 }, { id: 'whirl-label', prop: 'text-opacity', k: 1.8 }],
  spcCat: [{ id: 'spccat-fill', prop: 'fill-opacity', k: 1 }, { id: 'spccat-line', prop: 'line-opacity', k: 2.4 }],
  spcTorn: [{ id: 'spctorn-fill', prop: 'fill-opacity', k: 1 }, { id: 'spctorn-hatch', prop: 'fill-opacity', k: 2 }, { id: 'spctorn-line', prop: 'line-opacity', k: 2 }, { id: 'sigtorn-hatch', prop: 'fill-opacity', k: 2 }],
  spcD2: [{ id: 'spcd2-line', prop: 'line-opacity', k: 1 }],
  spcD3: [{ id: 'spcd3-line', prop: 'line-opacity', k: 1 }],
  md: [{ id: 'md-fill', prop: 'fill-opacity', k: 0.25 }, { id: 'md-line', prop: 'line-opacity', k: 1 }, { id: 'md-label', prop: 'text-opacity', k: 1.2 }],
  nhc: [{ id: 'nhc-cone', prop: 'fill-opacity', k: 0.25 }, { id: 'nhc-cone-line', prop: 'line-opacity', k: 1 }, { id: 'nhc-track', prop: 'line-opacity', k: 1 }],
  radar: [],
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
      ['spccat', 'spctorn', 'nws', 'sigtorn', 'spcd2', 'spcd3', 'md', 'nhc'].forEach((id) => map.addSource(id, { type: 'geojson', data: EMPTY }));
      // Diagonal hatch pattern for SPC conditional-intensity / significant tornado areas
      const c = document.createElement('canvas'); c.width = c.height = 12; const g = c.getContext('2d')!;
      g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 12); g.lineTo(12, 0); g.moveTo(-3, 3); g.lineTo(3, -3); g.moveTo(9, 15); g.lineTo(15, 9); g.stroke();
      map.addImage('hatch', g.getImageData(0, 0, 12, 12));
      map.addSource('whirl', { type: 'geojson', data: EMPTY, promoteId: 'id' });
      map.addSource('mask', { type: 'geojson', data: outsideUsMask() });
      map.addSource('conus', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: CONUS } } });
      map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#02040a', 'fill-opacity': 0.55 } });
      map.addLayer({ id: 'conus-line', type: 'line', source: 'conus', paint: { 'line-color': '#4fd1ff', 'line-opacity': 0.35, 'line-width': 1.2, 'line-blur': 1 } });
      map.addLayer({ id: 'spccat-fill', type: 'fill', source: 'spccat', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.35 } });
      map.addLayer({ id: 'spccat-line', type: 'line', source: 'spccat', paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.4 } });
      map.addLayer({ id: 'spctorn-fill', type: 'fill', source: 'spctorn', filter: ['!', isCig], paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.45 } });
      map.addLayer({ id: 'spctorn-hatch', type: 'fill', source: 'spctorn', filter: isCig, paint: { 'fill-pattern': 'hatch', 'fill-opacity': 0.8 } });
      map.addLayer({ id: 'spctorn-line', type: 'line', source: 'spctorn', paint: { 'line-color': ['case', isCig, '#111111', ['get', 'stroke']], 'line-width': 1.6 } });
      map.addLayer({ id: 'sigtorn-hatch', type: 'fill', source: 'sigtorn', paint: { 'fill-pattern': 'hatch', 'fill-opacity': 0.8 } });
      map.addLayer({ id: 'spcd2-line', type: 'line', source: 'spcd2', paint: { 'line-color': ['get', 'stroke'], 'line-width': 2, 'line-dasharray': [3, 2] } });
      map.addLayer({ id: 'spcd3-line', type: 'line', source: 'spcd3', paint: { 'line-color': ['get', 'stroke'], 'line-width': 2, 'line-dasharray': [1, 2] } });
      map.addLayer({ id: 'md-fill', type: 'fill', source: 'md', paint: { 'fill-color': '#3d8bff', 'fill-opacity': 0.2 } });
      map.addLayer({ id: 'md-line', type: 'line', source: 'md', paint: { 'line-color': '#3d8bff', 'line-width': 2, 'line-dasharray': [2, 1] } });
      map.addLayer({ id: 'md-label', type: 'symbol', source: 'md', layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-font': ['Open Sans Semibold'] }, paint: { 'text-color': '#9cc3ff', 'text-halo-color': '#000', 'text-halo-width': 1.2 } });
      map.addLayer({ id: 'nhc-cone', type: 'fill', source: 'nhc', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.2 } });
      map.addLayer({ id: 'nhc-cone-line', type: 'line', source: 'nhc', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#ffffff', 'line-width': 1.2 } });
      map.addLayer({ id: 'nhc-track', type: 'line', source: 'nhc', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#ffffff', 'line-width': 2.2, 'line-dasharray': [2, 1] } });
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
      const pop = new maplibregl.Popup({ className: 'alert-pop', maxWidth: '320px' });
      map.on('click', 'nws-fill', (e: maplibregl.MapLayerMouseEvent) => {
        if (map.queryRenderedFeatures(e.point, { layers: ['whirl-fill'] }).length) return;
        const f = e.features?.[0]; if (!f) return;
        const p = f.properties as Record<string, unknown>;
        pop.setLngLat(e.lngLat).setHTML(alertPopupHtml(p, undefined, fmtTime)).addTo(map);
        const url = String(p.url ?? '');
        if (/^https:\/\/api\.weather\.gov\/alerts\//.test(url)) {
          fetch(url, { headers: { Accept: 'application/geo+json' } }).then((r) => r.json()).then((j) => {
            const pr = j?.properties ?? {}; if (pop.isOpen()) pop.setHTML(alertPopupHtml(p, { headline: pr.headline, description: pr.description }, fmtTime));
          }).catch(() => { if (pop.isOpen()) pop.setHTML(alertPopupHtml(p, null, fmtTime)); });
        } else pop.setHTML(alertPopupHtml(p, null, fmtTime));
      });
      map.on('mouseenter', 'nws-fill', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'nws-fill', () => (map.getCanvas().style.cursor = ''));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const map = mapRef.current; const c = props.current;
    if (!map || !ready.current) return;
    (map.getSource('whirl') as GeoJSONSource).setData(c.hotspots);
    (map.getSource('spccat') as GeoJSONSource).setData(c.spcCat ?? EMPTY);
    (map.getSource('spctorn') as GeoJSONSource).setData(c.spcTorn ?? EMPTY);
    (map.getSource('nws') as GeoJSONSource).setData(c.nws ?? EMPTY);
    (map.getSource('sigtorn') as GeoJSONSource).setData(c.sigtorn ?? EMPTY);
    (map.getSource('spcd2') as GeoJSONSource).setData(c.spcD2 ?? EMPTY);
    (map.getSource('spcd3') as GeoJSONSource).setData(c.spcD3 ?? EMPTY);
    (map.getSource('md') as GeoJSONSource).setData(c.md ?? EMPTY);
    (map.getSource('nhc') as GeoJSONSource).setData(c.nhc ?? EMPTY);
    syncRadar();
    (Object.keys(LAYER_IDS) as LayerId[]).forEach((lid) => {
      const st = c.layers[lid];
      LAYER_IDS[lid].forEach(({ id, prop, k }) => {
        map.setLayoutProperty(id, 'visibility', st.visible ? 'visible' : 'none');
        if (id !== 'whirl-glow' && id !== 'whirl-fill') map.setPaintProperty(id, prop as 'fill-opacity', Math.min(1, st.opacity * k));
      });
    });
    c.hotspots.features.forEach((f) => map.setFeatureState({ source: 'whirl', id: f.id as string }, { selected: f.id === c.selectedId }));
  };
  // Radar loop: one raster layer per frame; only the current frame is opaque (no tile reload flicker).
  const radarIds = useRef<string[]>([]);
  const syncRadar = () => {
    const map = mapRef.current; const c = props.current;
    if (!map || !ready.current) return;
    const want = c.radarFrames.map((f) => `radar-${f.time}`);
    radarIds.current.filter((id) => !want.includes(id)).forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); });
    c.radarFrames.forEach((f, i) => {
      const id = want[i];
      if (!map.getSource(id)) map.addSource(id, { type: 'raster', tiles: [f.url], tileSize: 256, maxzoom: RADAR_MAX_ZOOM, attribution: '<a href="https://www.rainviewer.com/" target="_blank">RainViewer</a>' });
      if (!map.getLayer(id)) map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } }, 'spccat-fill');
    });
    radarIds.current = want;
    const st = c.layers.radar;
    const n = want.length;
    want.forEach((id, i) => {
      // Only the current and next frame are "visible" (requested) to avoid bursting RainViewer's rate limit.
      const near = i === c.radarIndex || i === (c.radarIndex + 1) % n;
      map.setLayoutProperty(id, 'visibility', st.visible && near ? 'visible' : 'none');
      map.setPaintProperty(id, 'raster-opacity', i === c.radarIndex ? st.opacity : 0);
    });
  };
  useEffect(sync, [p.hotspots, p.spcCat, p.spcTorn, p.nws, p.layers, p.selectedId, p.sigtorn, p.spcD2, p.spcD3, p.md, p.nhc, p.radarFrames]);
  useEffect(syncRadar, [p.radarIndex]);

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
