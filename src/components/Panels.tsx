import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { LAYER_META, type LayerId, type LayerState } from '../lib/layers';
import { fmtTime, highestCategory, spcTimes } from '../lib/feeds';
import { DEMO_LABEL, DEMO_RUN_INIT, type ModelId } from '../data/demo';
import { baseStyle, isCig } from './mapStyle';

export interface FeedStatus { loading: boolean; error: string | null; fetchedAt: Date; lastModified: string | null; via: string; count?: number }

export function DemoBadge({ small }: { small?: boolean }) {
  return <span className={`demo-badge${small ? ' sm' : ''}`} title={DEMO_LABEL}>DEMO</span>;
}

export function LayerPanel({ layers, setLayer, status, model }: {
  layers: Record<LayerId, LayerState>; setLayer: (id: LayerId, s: Partial<LayerState>) => void; status: Record<LayerId, FeedStatus | null>; model: ModelId;
}) {
  return (
    <div className="panel-body">
      <h3>Layers</h3>
      {LAYER_META.map((m) => {
        const st = layers[m.id]; const fs = status[m.id];
        return (
          <div key={m.id} className="layer-row">
            <label className="toggle">
              <input type="checkbox" checked={st.visible} onChange={(e) => setLayer(m.id, { visible: e.target.checked })} aria-label={`Toggle ${m.name}`} />
              <span className="name">{m.name}</span>{m.demo ? <DemoBadge small /> : <span className="live-badge">LIVE</span>}
            </label>
            <input type="range" min={0} max={1} step={0.05} value={st.opacity} aria-label={`${m.name} opacity`}
              onChange={(e) => setLayer(m.id, { opacity: Number(e.target.value) })} />
            <div className="legend">{m.legend.map((l) => <span key={l.label}><i style={{ background: l.color }} />{l.label}</span>)}</div>
            <div className="meta">
              <span>{m.source}</span>
              {m.demo ? <span>Synthetic {model} run {fmtTime(DEMO_RUN_INIT)} · not real</span> : fs ? (
                fs.error ? <span className="err">⚠ Feed error: {fs.error}</span>
                  : <span>{fs.loading && fs.fetchedAt.getTime() === 0 ? 'Loading…' : `Updated ${fmtTime(fs.lastModified ? new Date(fs.lastModified) : fs.fetchedAt)}${fs.count !== undefined ? ` · ${fs.count} features` : ''}${fs.via === 'proxy' ? ' · via proxy' : ''}`}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SpcPanel({ spcCat, spcTorn, catStatus, tornStatus, mainMap, hotspots, reload }: {
  spcCat: FeatureCollection | null; spcTorn: FeatureCollection | null; catStatus: FeedStatus; tornStatus: FeedStatus; mainMap: MLMap | null; hotspots: FeatureCollection; reload: () => void;
}) {
  const el = useRef<HTMLDivElement>(null); const mref = useRef<MLMap | null>(null); const [ok, setOk] = useState(false);
  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: baseStyle(false), center: mainMap?.getCenter() ?? [-95, 38], zoom: Math.max(2.5, (mainMap?.getZoom() ?? 3.3) - 0.6), interactive: false, attributionControl: false });
    mref.current = m;
    m.on('load', () => {
      m.addSource('cat', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('torn', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'cat', type: 'fill', source: 'cat', paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.4 } });
      m.addLayer({ id: 'catl', type: 'line', source: 'cat', paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.2 } });
      m.addLayer({ id: 'torn', type: 'line', source: 'torn', paint: { 'line-color': ['case', isCig, '#ddd', ['get', 'stroke']], 'line-width': 2 } });
      setOk(true);
    });
    const follow = () => { const c = mainMap; if (c) m.jumpTo({ center: c.getCenter(), zoom: Math.max(1.5, c.getZoom() - 0.6) }); };
    mainMap?.on('move', follow);
    return () => { mainMap?.off('move', follow); m.remove(); };
  }, [mainMap]);
  useEffect(() => {
    if (!ok || !mref.current) return;
    (mref.current.getSource('cat') as GeoJSONSource).setData(spcCat ?? { type: 'FeatureCollection', features: [] });
    (mref.current.getSource('torn') as GeoJSONSource).setData(spcTorn ?? { type: 'FeatureCollection', features: [] });
  }, [ok, spcCat, spcTorn]);
  const t = spcTimes(spcCat); const top = highestCategory(spcCat);
  const tornMax = useMemo(() => (spcTorn?.features ?? []).map((f) => String(f.properties?.LABEL)).filter((l) => !l.startsWith('CIG')).map(Number).reduce((a, b) => Math.max(a, b), 0), [spcTorn]);
  return (
    <div className="panel-body">
      <h3>SPC comparison</h3>
      <div className="compare">
        <div><div className="cmp-title">WHIRL-E <DemoBadge small /></div><div className="cmp-sub">{hotspots.features.length} synthetic hotspot(s) on main map</div></div>
        <div><div className="cmp-title">SPC Day 1 <span className="live-badge">LIVE</span></div><div className="cmp-sub">synced view ↓</div></div>
      </div>
      <div ref={el} className="mini-map" aria-label="SPC Day 1 outlook map" />
      {catStatus.error && !spcCat ? (
        <div className="err-box">⚠ Could not load SPC outlook: {catStatus.error} <button onClick={reload}>Retry</button></div>
      ) : (
        <dl className="kv">
          <dt>Highest category</dt><dd>{catStatus.loading && !spcCat ? 'Loading…' : top ?? 'None'}</dd>
          <dt>Max tornado prob.</dt><dd>{spcTorn ? (tornMax ? `${Math.round(tornMax * 100)}%` : '< 2%') : tornStatus.error ? 'error' : '—'}</dd>
          <dt>Issued</dt><dd>{fmtTime(t?.issue)}</dd><dt>Valid</dt><dd>{fmtTime(t?.valid)} → {fmtTime(t?.expire)}</dd>
          <dt>Forecaster</dt><dd>{t?.forecaster ?? '—'}</dd>
          <dt>Last-Modified</dt><dd>{fmtTime(catStatus.lastModified ? new Date(catStatus.lastModified) : null)}</dd>
          <dt>Fetched</dt><dd>{fmtTime(catStatus.fetchedAt.getTime() ? catStatus.fetchedAt : null)}</dd>
        </dl>
      )}
      <p className="muted">Official product: <a href="https://www.spc.noaa.gov/products/outlook/day1otlk.html" target="_blank" rel="noreferrer">spc.noaa.gov</a>. Always defer to SPC/NWS for safety decisions.</p>
    </div>
  );
}

