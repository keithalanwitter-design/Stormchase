import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import MapView from './components/MapView';
import { LayerPanel, SpcPanel, DemoBadge, type FeedStatus } from './components/Panels';
import EvidenceCard from './components/EvidenceCard';
import Playground from './components/Playground';
import ChaserFeed from './components/ChaserFeed';
import { CHASERS } from './lib/chasers';
import InfoPage from './components/InfoPage';
import { TOUR_STEPS } from './lib/tour';
import type { Tab } from './components/EvidenceCard';
import { haptic } from './components/Viz';
import { DEFAULT_LAYERS, searchPlaces, type LayerId, type LayerState } from './lib/layers';
import { SPC_CAT_URL, SPC_TORN_URL, fmtTime } from './lib/feeds';
import { DEMO_LABEL, HOTSPOT_DEFS, MODELS, MAX_FHR, demoHotspots, hotspotDetail, validTime, dayLabel, NORTH_AMERICA_BOUNDS, CONUS_VIEW, type ModelId } from './data/demo';
import { useFeed, useIsMobile, useRadarFrames, useNhc } from './hooks';
import { ALERT_COUNT_URL, SPC_D1_SIGTORN, SPC_D2_CAT, SPC_D3_CAT, SPC_MD_URL, wwaUrl, liveSummary, activeMds, RADAR_SPEEDS, RADAR_LATEST_HOLD_MS, nextReadyFrame } from './lib/live';

type Panel = 'layers' | 'spc' | 'play' | 'chasers' | null;
export const APP_BUILD_MARKER = 'stormchase-v7-radar-scroll';

export default function App() {
  const mobile = useIsMobile();
  const [tour, setTour] = useState<number | null>(null);
  const [tourTab, setTourTab] = useState<Tab | undefined>(undefined);
  const [info, setInfo] = useState(false);
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
  const nwsRaw = useFeed(ALERT_COUNT_URL, 2 * 60_000);
  const wwa = useFeed(wwaUrl(), 2 * 60_000);
  const nws = useMemo(() => wwa.data ?? { type: 'FeatureCollection' as const, features: [] }, [wwa.data]);
  const sigtorn = useFeed(SPC_D1_SIGTORN, 10 * 60_000);
  const spcD2 = useFeed(SPC_D2_CAT, 30 * 60_000);
  const spcD3 = useFeed(SPC_D3_CAT, 30 * 60_000);
  const mdRaw = useFeed(SPC_MD_URL, 5 * 60_000);
  const md = useMemo(() => ({ ...mdRaw, data: activeMds(mdRaw.data) }), [mdRaw]);
  const nhc = useNhc();
  const radar = useRadarFrames();
  const [live, setLive] = useState(true);
  const [radarIdx, setRadarIdx] = useState(-1);
  const [radarPlay, setRadarPlay] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const summary = useMemo(() => liveSummary(nwsRaw.data, spcTorn.data, sigtorn.data, md.data), [nwsRaw.data, spcTorn.data, sigtorn.data, md.data]);
  const nFrames = radar.frames.length;
  const rIdx = radarIdx < 0 || radarIdx >= nFrames ? nFrames - 1 : radarIdx;
  const [radarSpeed, setRadarSpeed] = useState<keyof typeof RADAR_SPEEDS>('normal');
  const [radarReady, setRadarReady] = useState<number[]>([]);
  const readyCount = radar.frames.filter((f) => radarReady.includes(f.time)).length;
  useEffect(() => {
    if (!radarPlay || nFrames < 2 || readyCount < 2) return;
    const t = setTimeout(() => setRadarIdx(nextReadyFrame(rIdx, nFrames, (i) => radarReady.includes(radar.frames[i].time))),
      rIdx === nFrames - 1 ? RADAR_LATEST_HOLD_MS : RADAR_SPEEDS[radarSpeed]);
    return () => clearTimeout(t);
  }, [radarPlay, nFrames, rIdx, radarSpeed, radarReady, readyCount, radar.frames]);
  const liveMode = live;
  const effLayers = useMemo(() => ({ ...layers, whirl: { ...layers.whirl, visible: layers.whirl.visible && !liveMode } }), [layers, liveMode]);

  const hotspots = useMemo(() => demoHotspots(model, fhr), [model, fhr]);
  const detail = useMemo(() => { const def = HOTSPOT_DEFS.find((d) => d.id === selectedId); return def ? hotspotDetail(def, model, fhr) : null; }, [selectedId, model, fhr]);

  useEffect(() => { if (!map) return; const t = setTimeout(() => setBooted(true), 700); return () => clearTimeout(t); }, [map]);
  useEffect(() => { document.documentElement.classList.toggle('doc-scroll', mobile); }, [mobile]);
  useEffect(() => { if (!map) return; const g = (map as unknown as { cooperativeGestures?: { enable(): void; disable(): void } }).cooperativeGestures; if (mobile) g?.enable(); else g?.disable(); }, [map, mobile]);
  const scrollToHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
  // Quick globe → US fly-in on load, then lock the view to North America.
  const flown = useRef(false);
  useEffect(() => {
    if (!map || flown.current) return; flown.current = true;
    const t = setTimeout(() => {
      map.once('moveend', () => { map.setMaxBounds(NORTH_AMERICA_BOUNDS); map.setMinZoom(mobile ? 2 : 2.6); });
      map.flyTo({ ...CONUS_VIEW, zoom: mobile ? 2.55 : CONUS_VIEW.zoom, pitch: 0, bearing: 0, duration: 2200, curve: 1.3, essential: true });
    }, 350);
    return () => clearTimeout(t);
  }, [map, mobile]);

  // Smooth play mode: advance in small fractional steps so hotspots grow/shrink fluidly.
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => { const dt = now - last; if (dt > 40) { last = now; setFhr((f) => { const n = f + dt / 90; return n > MAX_FHR ? 0 : n; }); } raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const toConus = useCallback(() => { map?.flyTo({ ...CONUS_VIEW, zoom: mobile ? 2.55 : CONUS_VIEW.zoom, pitch: 0, bearing: 0, speed: 0.9, curve: 1.3, essential: true, padding: { top: 0, bottom: 0, left: 0, right: 0 } }); }, [map, mobile]);
  const applyStep = useCallback((i: number) => {
    const s = TOUR_STEPS[i]; haptic(12);
    setTour(i); setLive(false); setInfo(false); setPanel(null); setPlaying(false); setShowSummary(false); setMarker(null); setExpanded(false);
    setFhr(s.fhr); setTourTab(s.tab); setSelectedId(s.select ?? null);
    if (s.layers) setLayers((L) => { const n = { ...L }; for (const [k, v] of Object.entries(s.layers!)) n[k as LayerId] = { ...n[k as LayerId], visible: !!v }; return n; });
    map?.flyTo({ ...s.camera, speed: 0.7, curve: 1.4, essential: true,
      padding: mobile ? { top: 150, bottom: s.select ? Math.round(window.innerHeight * 0.42) : 120, left: 0, right: 0 } : { top: 0, bottom: 0, left: 400, right: s.select ? 400 : 0 } });
  }, [map, mobile]);
  const startTour = useCallback(() => applyStep(0), [applyStep]);
  const backToLive = useCallback(() => {
    haptic(12); setTour(null); setLive(true); setSelectedId(null); setPanel(null); setPlaying(false); setLayers(DEFAULT_LAYERS); setMarker(null); toConus();
  }, [toConus]);

  const select = useCallback((id: string | null) => {
    if (id) { haptic(14); setLive(false); }
    setSelectedId(id); setMarker(null); setExpanded(false);
    const def = HOTSPOT_DEFS.find((d) => d.id === id);
    if (def && map) map.flyTo({ center: def.center, zoom: mobile ? 5.3 : 6.2, pitch: 50, bearing: -15, speed: 0.9, curve: 1.3, essential: true, padding: mobile ? { bottom: Math.round(window.innerHeight * 0.45), top: 40, left: 0, right: 0 } : { right: 400, top: 0, left: 0, bottom: 0 } });
    if (mobile && id) setPanel(null);
  }, [map, mobile]);

  const flyTarget = (ll: [number, number]) => { setMarker(ll); map?.flyTo({ center: ll, zoom: 8.5, pitch: 55, speed: 0.9 }); if (mobile) setExpanded(false); };

  useEffect(() => { (window as unknown as Record<string, unknown>).__stormchase = { setLive, startTour, backToLive, select, map, marker: APP_BUILD_MARKER, openPanel: setPanel, setFhr, hotspots: hotspots.features.length }; }, [startTour, backToLive, select, map, hotspots]);

  const setLayer = (id: LayerId, s: Partial<LayerState>) => setLayers((L) => ({ ...L, [id]: { ...L[id], ...s } }));
  const st = (f: typeof spcCat, count?: number): FeedStatus => ({ loading: f.loading, error: f.error, fetchedAt: f.fetchedAt, lastModified: f.lastModified, via: f.via, count });
  const radarStatus: FeedStatus = { loading: !radar.fetchedAt && !radar.error, error: radar.error, fetchedAt: radar.fetchedAt ?? new Date(0), lastModified: nFrames ? new Date(radar.frames[nFrames - 1].time * 1000).toUTCString() : null, via: 'direct', count: nFrames };
  const status = { radar: radarStatus, whirl: null, spcCat: st(spcCat, spcCat.data?.features.length), spcTorn: st(spcTorn, spcTorn.data?.features.length), spcD2: st(spcD2, spcD2.data?.features.length), spcD3: st(spcD3, spcD3.data?.features.length),
    md: st(md, md.data?.features.length), nws: st(wwa, nws.features.length), nhc: { loading: !nhc.data && !nhc.error, error: nhc.error, fetchedAt: new Date(), lastModified: null, via: 'direct', count: nhc.data?.features.length } };
  const results = searchPlaces(q);
  const fr = Math.round(fhr);
  const valid = validTime(fr);
  const fhrLabel = `${model} F${String(fr).padStart(3, '0')} · ${dayLabel(fr)} · valid ${fmtTime(valid)}`;
  const togglePanel = (p: Panel) => { haptic(); setPanel(panel === p ? null : p); if (mobile && p) setSelectedId(null); };

  return (
    <>
    <div className={`app ${mobile ? 'mobile' : 'desktop'} is-center ${live ? 'is-live' : 'is-demo'}`} data-build={APP_BUILD_MARKER}>
      <div className="stars" aria-hidden />
      <MapView hotspots={hotspots} spcCat={spcCat.data} spcTorn={spcTorn.data} nws={nws} layers={effLayers} sigtorn={sigtorn.data} spcD2={spcD2.data} spcD3={spcD3.data} md={md.data} nhc={nhc.data} radarFrames={radar.frames} radarIndex={rIdx} onRadarReady={setRadarReady} selectedId={selectedId} onSelect={select} onReady={setMap} spin={false} marker={marker} />

      <div className={`splash ${booted ? 'gone' : ''}`} aria-hidden={booted}>
        <div className="vortex"><i /><i /><i /></div>
        <div className="splash-title">STORM<b>CHASE</b></div><small>Loading live radar & outlooks…</small>
      </div>

      <header className="topbar">
        <button className="brand" onClick={() => { if (live) toConus(); else backToLive(); }} aria-label="StormChase home"><span className="logo">◎</span><span>STORM<b>CHASE</b></span></button>
        {live ? <span className="status-pill live" data-testid="mode-live">● LIVE</span> : <span className="status-pill demo">DEMO</span>}
        {live
          ? <button className="hdr-demo" onClick={startTour} data-testid="try-demo">Try a demo chase day</button>
          : <button className="hdr-demo back" onClick={backToLive} data-testid="back-live">← Back to live</button>}
        {!mobile && <div className="search">
          <input placeholder="Search US place…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search location" />
          {results.length > 0 && <ul className="search-results">{results.map((r) => (
            <li key={r.name}><button onClick={() => { haptic(); setQ(''); map?.flyTo({ center: [r.lon, r.lat], zoom: 7.5, pitch: 40 }); }}>{r.name}</button></li>))}</ul>}
        </div>}
        <nav className="tabs">
          {((live ? ['layers', 'spc', 'chasers'] : ['layers', 'spc', 'play', 'chasers']) as Panel[]).map((p) => (
            <button key={p} className={panel === p ? 'on' : ''} onClick={() => togglePanel(p)}>{p === 'layers' ? 'Layers' : p === 'spc' ? 'SPC' : p === 'play' ? 'Playground' : 'Chasers'}</button>))}
          <button className={info ? 'on' : ''} onClick={() => { haptic(); if (mobile) scrollToHow(); else setInfo(!info); }} data-testid="how-link">How it works</button>
        </nav>
      </header>

      {panel && (
        <aside className="side panel slide-in" aria-label={`${panel} panel`}>
          <button className="icon close" onClick={() => setPanel(null)} aria-label="Close panel">✕</button>
          {panel === 'layers' && <LayerPanel layers={layers} setLayer={setLayer} status={status} model={model} />}
          {panel === 'spc' && <SpcPanel spcCat={spcCat.data} spcTorn={spcTorn.data} catStatus={st(spcCat)} tornStatus={st(spcTorn)} mainMap={map} hotspots={hotspots} reload={() => { void spcCat.reload(); void spcTorn.reload(); }} />}
          {panel === 'play' && <Playground />}
          {panel === 'chasers' && <ChaserFeed />}
        </aside>
      )}

      {liveMode && (
        <button className={`live-chip ${summary.tornadoWarnings ? 'alarm' : ''}`} data-testid="live-chip" onClick={() => { haptic(); setShowSummary(!showSummary); }}>
          <span className="dot" /> Live now · <b>{summary.tornadoWarnings}</b> TOR warn · <b>{summary.tornadoWatches}</b> TOR watch · SPC tor <b>{summary.maxTornPct ? `${summary.maxTornPct}%` : '<2%'}</b>{summary.sigHatched ? ' ▨' : ''}{summary.mds ? ` · ${summary.mds} MD` : ''}
        </button>)}
      {liveMode && showSummary && (
        <div className="live-detail slide-up" data-testid="live-detail">
          <div className="eyebrow">Official data · live</div>
          <ul>
            <li>Tornado warnings: <b>{summary.tornadoWarnings}</b> · watches: <b>{summary.tornadoWatches}</b> · severe T-storm warnings: <b>{summary.severeWarnings}</b> · tropical warnings: <b>{summary.tropicalWarnings}</b></li>
            <li>SPC Day 1 max tornado probability: <b>{summary.maxTornPct ? `${summary.maxTornPct}%` : 'below 2%'}</b>{summary.conditionalIntensity ? ` · hatched ${summary.conditionalIntensity} (conditional intensity)` : ''}</li>
            <li>SPC mesoscale discussions active: <b>{summary.mds}</b>{md.data?.features.map((f) => ` · ${String(f.properties?.name ?? '')}`).join('')}</li>
            <li>NHC cone/track features: <b>{nhc.data?.features.length ?? '…'}</b>{nhc.error ? ` (error: ${nhc.error})` : ''}</li>
            {summary.tornadoAreas.slice(0, 8).map((a) => <li key={a} className="muted">{a}</li>)}
          </ul>
          <p className="muted">Sources: NWS api.weather.gov &amp; mapservices, SPC, NHC, RainViewer. Tap a warning polygon for details.</p>
        </div>)}

      {!panel && !selectedId && !liveMode && tour === null && (
        <aside className="side status-cards slide-in">
          <div className="mini-card"><div className="eyebrow">WHIRL-E corridors · {dayLabel(fr)} <DemoBadge small /></div>
            {hotspots.features.length ? [...hotspots.features].sort((a, b) => b.properties.score - a.properties.score).map((f) => (
              <button key={f.properties.id} className="hs-row" onClick={() => select(f.properties.id)}><span>{f.properties.name}<small>{f.properties.region}</small></span><b className={`cat-${f.properties.category}`}>{f.properties.score.toFixed(2)}</b></button>
            )) : <p className="muted">No favorable demo environment at this hour — press ▶ or scrub the timeline.</p>}
          </div>
          <div className="mini-card"><div className="eyebrow">Chaser Feed <span className="third-badge">3RD-PARTY</span></div>
            <button className="hs-row" onClick={() => togglePanel('chasers')}><span>Latest posts<small>{CHASERS.map((c) => c.name.split(',')[0]).join(' · ')}</small></span><b>↗</b></button>
          </div>
        </aside>
      )}

      {detail && <aside className="detail slide-up"><EvidenceCard d={detail} model={model} fhr={fr} setFhr={setFhr} spcCat={spcCat.data} spcTorn={spcTorn.data} onClose={() => { haptic(); setSelectedId(null); }} fhrLabel={fhrLabel} expanded={expanded} setExpanded={setExpanded} onFlyTo={flyTarget} key={`${detail.def.id}-${tour ?? 'x'}-${tourTab ?? ''}`} initialTab={tour !== null ? tourTab : undefined} /></aside>}

      {liveMode && (
        <footer className="timebar radarbar" data-testid="radar-bar">
          <span className="live-badge">LIVE</span>
          <button className={`play ${radarPlay ? 'on' : ''}`} onClick={() => { haptic(12); setRadarPlay(!radarPlay); }} aria-label={radarPlay ? 'Pause radar loop' : 'Play radar loop'}>{radarPlay ? '❚❚' : '▶'}</button>
          <button className="speed" data-testid="radar-speed" onClick={() => { haptic(); setRadarSpeed(radarSpeed === 'slow' ? 'normal' : radarSpeed === 'normal' ? 'fast' : 'slow'); }} aria-label="Loop speed">{radarSpeed === 'slow' ? '0.5×' : radarSpeed === 'normal' ? '1×' : '2×'}</button>
          <div className="slider-wrap"><input type="range" min={0} max={Math.max(0, nFrames - 1)} value={Math.max(0, rIdx)} onChange={(e) => { setRadarPlay(false); setRadarIdx(Number(e.target.value)); }} aria-label="Radar frame" /></div>
          <div className="time"><b>{nFrames ? `Radar ${fmtTime(new Date(radar.frames[rIdx].time * 1000))}` : radar.error ? 'Radar unavailable' : 'Loading radar…'}</b><small>RainViewer mosaic · {rIdx === nFrames - 1 ? 'latest' : `${nFrames - 1 - rIdx} frames ago`} · {readyCount}/{nFrames} loaded</small></div>
        </footer>)}
      {!liveMode && (
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
      {!live && <div className="demo-banner" data-testid="demo-banner" role="status">DEMO CHASE DAY · synthetic data · not a forecast</div>}
      {tour !== null && (() => { const s = TOUR_STEPS[tour]; const last = tour === TOUR_STEPS.length - 1; return (
        <aside className="tour-card slide-up" data-testid="tour-card" key={s.id}>
          <div className="eyebrow">{s.kicker} <span className="demo-badge sm">DEMO</span></div>
          <h3>{s.title}</h3>
          {s.body.map((b) => <p key={b}>{b}</p>)}
          <div className="tour-dots">{TOUR_STEPS.map((x, i) => <button key={x.id} className={i === tour ? 'on' : ''} onClick={() => applyStep(i)} aria-label={x.title} />)}</div>
          <div className="tour-nav">
            <button className="ghost" disabled={tour === 0} onClick={() => applyStep(tour - 1)}>← Back</button>
            {last ? <>
              <button className="ghost" onClick={() => { setTour(null); setSelectedId(null); setPanel('play'); }}>Open Playground</button>
              <button className="cta" onClick={backToLive} data-testid="tour-back-live">Back to live</button>
            </> : <button className="cta" onClick={() => applyStep(tour + 1)} data-testid="tour-next">Next →</button>}
          </div>
          <button className="tour-exit" onClick={backToLive}>Exit demo</button>
        </aside>); })()}
      {info && !mobile && <InfoPage onClose={() => setInfo(false)} onDemo={startTour} onPlayground={() => { setInfo(false); setLive(false); setPanel('play'); }} />}
      {!mobile && !info && tour === null && <button className="pull-tab" onClick={() => { haptic(); setInfo(true); }} onWheel={(e) => { if (e.deltaY > 0) setInfo(true); }}>How it works · demo · FAQ ↑</button>}
      <div className={`demo-ribbon ${liveMode ? 'live' : ''}`} title={DEMO_LABEL}>{liveMode ? 'LIVE · official NWS/SPC/NHC data + RainViewer radar · demo hotspots hidden · always follow NWS warnings' : 'DEMO · synthetic hotspots · WHIRL is experimental · defer to NWS/SPC'}</div>
    </div>
    {mobile && <section className="below" id="how-wrap">
      <button className="peek" onClick={scrollToHow} data-testid="peek"><span className="chev">⌄</span><b>How it works, demo & FAQ</b><small>Swipe up with one finger · use two fingers to move the map</small></button>
      <div id="how"><InfoPage embedded onClose={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onDemo={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); startTour(); }} onPlayground={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setLive(false); setPanel('play'); }} /></div>
    </section>}
    </>
  );
}