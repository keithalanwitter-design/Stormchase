import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import MapView from './components/MapView';
import { LayerPanel, HotspotCard, SpcPanel, CalculatorPanel, DemoBadge, type FeedStatus } from './components/Panels';
import { DEFAULT_LAYERS, searchPlaces, type LayerId, type LayerState } from './lib/layers';
import { NWS_ALERTS_URL, SPC_CAT_URL, SPC_TORN_URL, filterSevereAlerts, fmtTime } from './lib/feeds';
import { DEMO_LABEL, HOTSPOT_DEFS, MODELS, demoHotspots, hotspotDetail, validTime, type ModelId } from './data/demo';
import { useFeed, useIsMobile } from './hooks';

type Panel = 'layers' | 'spc' | 'calc' | null;
const US_VIEW = { center: [-92.5, 37.5] as [number, number], zoom: 4.3 };

export default function App() {
  const mobile = useIsMobile();
  const [landing, setLanding] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [model, setModel] = useState<ModelId>('HRRR');
  const [fhr, setFhr] = useState(10);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const [q, setQ] = useState('');

  const spcCat = useFeed(SPC_CAT_URL, 10 * 60_000);
  const spcTorn = useFeed(SPC_TORN_URL, 10 * 60_000);
  const nwsRaw = useFeed(NWS_ALERTS_URL, 2 * 60_000);
  const nws = useMemo(() => filterSevereAlerts(nwsRaw.data), [nwsRaw.data]);

  const m = MODELS.find((x) => x.id === model)!;
  const hotspots = useMemo(() => demoHotspots(model, fhr), [model, fhr]);
  const detail = useMemo(() => { const def = HOTSPOT_DEFS.find((d) => d.id === selectedId); return def ? hotspotDetail(def, model, fhr) : null; }, [selectedId, model, fhr]);

  useEffect(() => { if (fhr > m.maxFhr) setFhr(m.maxFhr); }, [m, fhr]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFhr((f) => (f + m.step > Math.min(m.maxFhr, 36) ? 0 : f + m.step)), 700);
    return () => clearInterval(t);
  }, [playing, m]);

  const enter = useCallback(() => { setLanding(false); map?.flyTo({ ...US_VIEW, speed: 0.7, curve: 1.6, essential: true }); }, [map]);
  const toGlobe = () => { setLanding(true); setSelectedId(null); map?.flyTo({ center: [-60, 28], zoom: 1.35, pitch: 0, bearing: 0, speed: 0.8 }); };
  const select = useCallback((id: string | null) => {
    setSelectedId(id); setLanding(false);
    const def = HOTSPOT_DEFS.find((d) => d.id === id);
    if (def && map) map.flyTo({ center: def.center, zoom: Math.max(map.getZoom(), 5.4), speed: 0.9, padding: mobile ? { bottom: 320 } : { right: 380 } });
    if (mobile && id) setPanel(null);
  }, [map, mobile]);

  // Expose a tiny hook for automated screenshots/smoke checks (no user data).
  useEffect(() => { (window as unknown as Record<string, unknown>).__stormchase = { enter, select, map, hotspots: hotspots.features.length }; }, [enter, select, map, hotspots]);

  const setLayer = (id: LayerId, s: Partial<LayerState>) => setLayers((L) => ({ ...L, [id]: { ...L[id], ...s } }));
  const st = (f: typeof spcCat, count?: number): FeedStatus => ({ loading: f.loading, error: f.error, fetchedAt: f.fetchedAt, lastModified: f.lastModified, via: f.via, count });
  const status = { whirl: null, spcCat: st(spcCat, spcCat.data?.features.length), spcTorn: st(spcTorn, spcTorn.data?.features.length), nws: st(nwsRaw, nws.features.length) };
  const results = searchPlaces(q);
  const valid = validTime(fhr);
  const fhrLabel = `${model} F${String(fhr).padStart(3, '0')} · valid ${fmtTime(valid)}`;

  return (
    <div className={`app ${mobile ? 'mobile' : 'desktop'} ${landing ? 'is-landing' : ''}`}>
      <div className="stars" aria-hidden />
      <MapView hotspots={hotspots} spcCat={spcCat.data} spcTorn={spcTorn.data} nws={nws} layers={layers} selectedId={selectedId} onSelect={select} onReady={setMap} landing={landing} />

      <header className="topbar">
        <button className="brand" onClick={toGlobe} aria-label="Back to globe"><span className="logo">◎</span><span>STORM<b>CHASE</b></span></button>
        <span className="mode-pill">Forecast Center</span>
        <DemoBadge />
        <div className="search">
          <input placeholder="Search place…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search location" />
          {results.length > 0 && <ul className="search-results">{results.map((r) => (
            <li key={r.name}><button onClick={() => { setQ(''); setLanding(false); map?.flyTo({ center: [r.lon, r.lat], zoom: 7 }); }}>{r.name}</button></li>))}</ul>}
        </div>
        <nav className="tabs">
          {(['layers', 'spc', 'calc'] as const).map((p) => (
            <button key={p} className={panel === p ? 'on' : ''} onClick={() => setPanel(panel === p ? null : p)}>{p === 'layers' ? 'Layers' : p === 'spc' ? 'SPC' : 'WHIRL calc'}</button>))}
        </nav>
      </header>

      {landing && (
        <section className="hero">
          <div className="eyebrow">Witter–Hart Integrated Rotational Likelihood</div>
          <h1>STORM<b>CHASE</b></h1>
          <p>Globe-to-regional severe-weather Forecast Center. Live SPC outlooks and NWS warnings, with experimental WHIRL-E environments shown in clearly labeled demo mode.</p>
          <button className="cta" onClick={enter}>Enter Forecast Center →</button>
          <div className="hero-stats">
            <div><small>SPC Day 1</small><b>{spcCat.error && !spcCat.data ? 'error' : spcCat.data ? 'live' : '…'}</b></div>
            <div><small>NWS severe alerts</small><b>{nwsRaw.error && !nwsRaw.data ? 'error' : nwsRaw.data ? nws.features.length : '…'}</b></div>
            <div><small>WHIRL-E areas</small><b>{hotspots.features.length} <DemoBadge small /></b></div>
          </div>
        </section>
      )}

      {panel && (
        <aside className="side panel" aria-label={`${panel} panel`}>
          <button className="icon close" onClick={() => setPanel(null)} aria-label="Close panel">✕</button>
          {panel === 'layers' && <LayerPanel layers={layers} setLayer={setLayer} status={status} model={model} />}
          {panel === 'spc' && <SpcPanel spcCat={spcCat.data} spcTorn={spcTorn.data} catStatus={st(spcCat)} tornStatus={st(spcTorn)} mainMap={map} hotspots={hotspots} reload={() => { void spcCat.reload(); void spcTorn.reload(); }} />}
          {panel === 'calc' && <CalculatorPanel />}
        </aside>
      )}

      {!landing && !panel && !selectedId && (
        <aside className="side status-cards">
          <div className="mini-card"><div className="eyebrow">WHIRL-E <DemoBadge small /></div>
            {hotspots.features.length ? hotspots.features.map((f) => (
              <button key={f.properties.id} className="hs-row" onClick={() => select(f.properties.id)}><span>{f.properties.name}</span><b className={`cat-${f.properties.category}`}>{f.properties.score.toFixed(2)}</b></button>
            )) : <p className="muted">No favorable demo environment at this hour.</p>}
          </div>
          <div className="mini-card"><div className="eyebrow">Model status <DemoBadge small /></div><p className="muted">{model} synthetic run · {fhrLabel}</p></div>
        </aside>
      )}

      {detail && <aside className="detail"><HotspotCard d={detail} spcCat={spcCat.data} spcTorn={spcTorn.data} onClose={() => setSelectedId(null)} fhrLabel={fhrLabel} /></aside>}

      {!landing && (
        <footer className="timebar">
          <select value={model} onChange={(e) => setModel(e.target.value as ModelId)} aria-label="Model">{MODELS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          <input type="range" min={0} max={m.maxFhr} step={m.step} value={fhr} onChange={(e) => setFhr(Number(e.target.value))} aria-label="Forecast hour" />
          <div className="time"><b>F{String(fhr).padStart(3, '0')}</b><small>{fmtTime(valid)}</small></div>
        </footer>
      )}
      <div className="demo-ribbon" title={DEMO_LABEL}>{DEMO_LABEL} · WHIRL is experimental · defer to NWS/SPC</div>
    </div>
  );
}
