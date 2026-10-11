import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import MapView from './components/MapView';
import { LayerPanel, SpcPanel, DemoBadge, type FeedStatus } from './components/Panels';
import EvidenceCard from './components/EvidenceCard';
import Playground from './components/Playground';
import ChaserFeed from './components/ChaserFeed';
import { CHASERS } from './lib/chasers';
import Story, { STORY_STEPS } from './components/Story';
import { haptic } from './components/Viz';
import { DEFAULT_LAYERS, searchPlaces, type LayerId, type LayerState } from './lib/layers';
import { NWS_ALERTS_URL, SPC_CAT_URL, SPC_TORN_URL, filterSevereAlerts, fmtTime } from './lib/feeds';
import { DEMO_LABEL, HOTSPOT_DEFS, MODELS, MAX_FHR, demoHotspots, peakHotspots, hotspotDetail, validTime, dayLabel, NORTH_AMERICA_BOUNDS, CONUS_VIEW, type ModelId } from './data/demo';
import { useFeed, useIsMobile } from './hooks';

type Panel = 'layers' | 'spc' | 'play' | 'chasers' | null;
export const APP_BUILD_MARKER = 'stormchase-na-v3-chasers';

export default function App() {
  const mobile = useIsMobile();
  const [story, setStory] = useState(true);
  const [step, setStep] = useState(0);
  const [booted, setBooted] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [model, setModel] = useState<ModelId>('HRRR');
  const [fhr, setFhr] = useState(57);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [marker, setMarker] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const [q, setQ] = useState('');

  const spcCat = useFeed(SPC_CAT_URL, 10 * 60_000);
  const spcTorn = useFeed(SPC_TORN_URL, 10 * 60_000);
  const nwsRaw = useFeed(NWS_ALERTS_URL, 2 * 60_000);
  const nws = useMemo(() => filterSevereAlerts(nwsRaw.data), [nwsRaw.data]);

  const showPeaks = story && step === 1;
  const hotspots = useMemo(() => (showPeaks ? peakHotspots(model) : demoHotspots(model, fhr)), [model, fhr, showPeaks]);
  const detail = useMemo(() => { const def = HOTSPOT_DEFS.find((d) => d.id === selectedId); return def ? hotspotDetail(def, model, fhr) : null; }, [selectedId, model, fhr]);

  useEffect(() => { if (!map) return; const t = setTimeout(() => setBooted(true), 700); return () => clearTimeout(t); }, [map]);
  // On phones the story cards sit at the bottom, so lift the camera focus into the top half.
  useEffect(() => { if (map) map.setPadding(story && mobile ? { top: 40, bottom: Math.round(window.innerHeight * 0.5), left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 }); }, [map, story, mobile]);

  // Smooth play mode: advance in small fractional steps so hotspots grow/shrink fluidly.
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => { const dt = now - last; if (dt > 40) { last = now; setFhr((f) => { const n = f + dt / 90; return n > MAX_FHR ? 0 : n; }); } raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const onStep = useCallback((i: number) => {
    setStep(i);
    const s = STORY_STEPS[i]; if (!map) return;
    setFhr(s.fhr); setSelectedId(null);
    map.flyTo({ ...s.camera, speed: 0.6, curve: 1.5, essential: true });
  }, [map]);

  const enter = useCallback(() => {
    haptic(12); setStory(false); setPanel(null); setSelectedId(null);
    if (map) { map.setMaxBounds(NORTH_AMERICA_BOUNDS); map.setMinZoom(2.6); map.flyTo({ ...CONUS_VIEW, pitch: 0, bearing: 0, speed: 0.8, curve: 1.4, essential: true }); }
  }, [map]);
  const toStory = () => { haptic(); setStory(true); setStep(0); setSelectedId(null); setPanel(null); setPlaying(false);
    if (map) { map.setMaxBounds(null); map.setMinZoom(1.2); map.flyTo({ ...STORY_STEPS[0].camera, speed: 0.8 }); } };

  const select = useCallback((id: string | null) => {
    if (id) haptic(14);
    setSelectedId(id); setMarker(null); setExpanded(false);
    if (story && id) { setStory(false); map?.setMaxBounds(NORTH_AMERICA_BOUNDS); map?.setMinZoom(2.6); }
    const def = HOTSPOT_DEFS.find((d) => d.id === id);
    if (def && map) map.flyTo({ center: def.center, zoom: mobile ? 5.3 : 6.2, pitch: 50, bearing: -15, speed: 0.9, curve: 1.3, essential: true, padding: mobile ? { bottom: Math.round(window.innerHeight * 0.45), top: 40, left: 0, right: 0 } : { right: 400, top: 0, left: 0, bottom: 0 } });
    if (mobile && id) setPanel(null);
  }, [map, mobile, story]);

  const flyTarget = (ll: [number, number]) => { setMarker(ll); map?.flyTo({ center: ll, zoom: 8.5, pitch: 55, speed: 0.9 }); if (mobile) setExpanded(false); };

  useEffect(() => { (window as unknown as Record<string, unknown>).__stormchase = { enter, select, map, marker: APP_BUILD_MARKER, openPanel: setPanel, setFhr, hotspots: hotspots.features.length }; }, [enter, select, map, hotspots]);

  const setLayer = (id: LayerId, s: Partial<LayerState>) => setLayers((L) => ({ ...L, [id]: { ...L[id], ...s } }));
  const st = (f: typeof spcCat, count?: number): FeedStatus => ({ loading: f.loading, error: f.error, fetchedAt: f.fetchedAt, lastModified: f.lastModified, via: f.via, count });
  const status = { whirl: null, spcCat: st(spcCat, spcCat.data?.features.length), spcTorn: st(spcTorn, spcTorn.data?.features.length), nws: st(nwsRaw, nws.features.length) };
  const results = searchPlaces(q);
  const fr = Math.round(fhr);
  const valid = validTime(fr);
  const fhrLabel = `${model} F${String(fr).padStart(3, '0')} · ${dayLabel(fr)} · valid ${fmtTime(valid)}`;
  const togglePanel = (p: Panel) => { haptic(); setPanel(panel === p ? null : p); if (mobile && p) setSelectedId(null); };

  return (
    <div className={`app ${mobile ? 'mobile' : 'desktop'} ${story ? 'is-story' : 'is-center'}`} data-build={APP_BUILD_MARKER}>
      <div className="stars" aria-hidden />
      <MapView hotspots={hotspots} spcCat={spcCat.data} spcTorn={spcTorn.data} nws={nws} layers={layers} selectedId={selectedId} onSelect={select} onReady={setMap} spin={story && step === 0} marker={marker} />

      <div className={`splash ${booted ? 'gone' : ''}`} aria-hidden={booted}>
        <div className="vortex"><i /><i /><i /></div>
        <div className="splash-title">STORM<b>CHASE</b></div><small>Spinning up the globe…</small>
      </div>

      <header className="topbar">
        <button className="brand" onClick={toStory} aria-label="Back to story"><span className="logo">◎</span><span>STORM<b>CHASE</b></span></button>
        <span className="mode-pill">{story ? 'Tour' : 'Forecast Center · US'}</span>
        <DemoBadge />
        {!story && <div className="search">
          <input placeholder="Search US place…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search location" />
          {results.length > 0 && <ul className="search-results">{results.map((r) => (
            <li key={r.name}><button onClick={() => { haptic(); setQ(''); map?.flyTo({ center: [r.lon, r.lat], zoom: 7.5, pitch: 40 }); }}>{r.name}</button></li>))}</ul>}
        </div>}
        <nav className="tabs">
          {story ? <button onClick={enter}>Skip tour →</button> : (['layers', 'spc', 'play', 'chasers'] as const).map((p) => (
            <button key={p} className={panel === p ? 'on' : ''} onClick={() => togglePanel(p)}>{p === 'layers' ? 'Layers' : p === 'spc' ? 'SPC' : p === 'play' ? 'Playground' : 'Chasers'}</button>))}
        </nav>
      </header>

      {story && <Story step={step} onStep={onStep} onEnter={enter} onPlayground={() => { enter(); setPanel('play'); }}
        stats={{ spc: spcCat.error && !spcCat.data ? 'error' : spcCat.data ? 'live' : '…', nws: nwsRaw.error && !nwsRaw.data ? 'error' : nwsRaw.data ? String(nws.features.length) : '…', hs: HOTSPOT_DEFS.length }} />}

      {!story && panel && (
        <aside className="side panel slide-in" aria-label={`${panel} panel`}>
          <button className="icon close" onClick={() => setPanel(null)} aria-label="Close panel">✕</button>
          {panel === 'layers' && <LayerPanel layers={layers} setLayer={setLayer} status={status} model={model} />}
          {panel === 'spc' && <SpcPanel spcCat={spcCat.data} spcTorn={spcTorn.data} catStatus={st(spcCat)} tornStatus={st(spcTorn)} mainMap={map} hotspots={hotspots} reload={() => { void spcCat.reload(); void spcTorn.reload(); }} />}
          {panel === 'play' && <Playground />}
          {panel === 'chasers' && <ChaserFeed />}
        </aside>
      )}

      {!story && !panel && !selectedId && (
        <aside className="side status-cards slide-in">
          <div className="mini-card"><div className="eyebrow">WHIRL-E corridors · {dayLabel(fr)} <DemoBadge small /></div>
            {hotspots.features.length ? [...hotspots.features].sort((a, b) => b.properties.score - a.properties.score).map((f) => (
              <button key={f.properties.id} className="hs-row" onClick={() => select(f.properties.id)}><span>{f.properties.name}<small>{f.properties.region}</small></span><b className={`cat-${f.properties.category}`}>{f.properties.score.toFixed(2)}</b></button>
            )) : <p className="muted">No favorable demo environment at this hour — press ▶ or scrub the timeline.</p>}
          </div>
          <div className="mini-card"><div className="eyebrow">Chaser Feed <span className="third-badge">3RD-PARTY</span></div>
            {CHASERS.map((c) => <button key={c.id} className="hs-row" onClick={() => togglePanel('chasers')}><span>{c.name}<small>@{c.xHandle} · X / live</small></span><b>↗</b></button>)}
          </div>
        </aside>
      )}

      {!story && detail && <aside className="detail slide-up"><EvidenceCard d={detail} model={model} fhr={fr} setFhr={setFhr} spcCat={spcCat.data} spcTorn={spcTorn.data} onClose={() => { haptic(); setSelectedId(null); }} fhrLabel={fhrLabel} expanded={expanded} setExpanded={setExpanded} onFlyTo={flyTarget} /></aside>}

      {!story && (
        <footer className="timebar">
          <select value={model} onChange={(e) => { haptic(); setModel(e.target.value as ModelId); }} aria-label="Model">{MODELS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <button className={`play ${playing ? 'on' : ''}`} onClick={() => { haptic(12); setPlaying(!playing); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          <div className="slider-wrap">
            <input type="range" min={0} max={MAX_FHR} step={1} value={fr} onChange={(e) => { setPlaying(false); setFhr(Number(e.target.value)); }} aria-label="Forecast hour" />
            <div className="day-ticks">{['Day 3', 'Day 2', 'Day 1', 'Day 0'].map((d) => <span key={d}>{d}</span>)}</div>
          </div>
          <div className="time"><b>{dayLabel(fr)} · F{String(fr).padStart(3, '0')}</b><small>{fmtTime(valid)}</small></div>
        </footer>
      )}
      <div className="demo-ribbon" title={DEMO_LABEL}>DEMO · synthetic hotspots · WHIRL is experimental · defer to NWS/SPC</div>
    </div>
  );
}
