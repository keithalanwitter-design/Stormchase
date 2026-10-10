import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { LAYER_META, LayerId, LayerState } from '../lib/layers';
import { fmtTime, highestCategory, spcTimes } from '../lib/feeds';
import { computeWhirl, WHIRL_VERSION, WhirlInputs, StormMode } from '../lib/whirl';
import { DEMO_LABEL, DEMO_RUN_INIT, HotspotDetail, ModelId } from '../data/demo';
import { labelsAt } from '../lib/geo';
import { STCI_VERSION, STCI_WEIGHTS } from '../lib/stci';
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

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');

export function HotspotCard({ d, spcCat, spcTorn, onClose, fhrLabel }: {
  d: HotspotDetail; spcCat: FeatureCollection | null; spcTorn: FeatureCollection | null; onClose: () => void; fhrLabel: string;
}) {
  const { def, result, inputs, perModel, spreadPct, stci, stciInputs } = d;
  const [formula, setFormula] = useState<'whirl' | 'stci'>('whirl');
  const liveCat = labelsAt(def.center, spcCat); const liveTorn = labelsAt(def.center, spcTorn);
  const maxS = Math.max(...perModel.map((p) => p.score), 0.01);
  const rows: [string, string, number][] = [
    ['0–500 m SRH', `${fmt(inputs.srh500, 0)} m²/s²`, result.terms.srhTerm], ['Eff. bulk shear', `${fmt(inputs.effShearKt, 0)} kt`, result.terms.sShear],
    ['MLCAPE', `${fmt(inputs.mlcape, 0)} J/kg`, result.terms.sCape], ['ML LCL', `${fmt(inputs.mllclM, 0)} m`, result.terms.sLcl],
    ['MLCIN', `${fmt(inputs.mlcin, 0)} J/kg`, result.terms.sCin], ['Storm mode', inputs.mode, result.terms.mMode], ['Boundary', inputs.boundary ? 'active' : 'none', result.terms.mBoundary],
  ];
  return (
    <div className="card" role="dialog" aria-label={`${def.name} evidence card`} data-testid="hotspot-card">
      <div className="card-head">
        <div><div className="eyebrow">WHIRL-E environmental favorability <DemoBadge small /></div><h2>{def.name}</h2></div>
        <button className="icon" onClick={onClose} aria-label="Close card">✕</button>
      </div>
      <div className="seg" role="tablist" aria-label="Formula">
        <button role="tab" aria-selected={formula === 'whirl'} className={formula === 'whirl' ? 'on' : ''} onClick={() => setFormula('whirl')}>WHIRL v0.1</button>
        <button role="tab" aria-selected={formula === 'stci'} className={formula === 'stci' ? 'on' : ''} onClick={() => setFormula('stci')}>STCI (exp.)</button>
      </div>
      {formula === 'whirl' ? (<>
      <div className={`score cat-${result.category}`}><b>{fmt(result.score)}</b><span>{result.category}<br /><small>{WHIRL_VERSION} · {fhrLabel}</small></span></div>
      <p className="disclaimer">Synthetic demonstration region — an environmental favorability area, <b>not a tornado path</b>, not a warning, not a calibrated probability.</p>
      <section><h4>Ingredients</h4>
        <table className="ing"><tbody>{rows.map(([k, v, t]) => <tr key={k}><td>{k}</td><td>{v}</td><td className="term">×{fmt(t)}</td></tr>)}</tbody></table>
      </section>
      </>) : (<>
      <div className="score"><b>{fmt(stci.score)}</b><span>/ 10<br /><small>{STCI_VERSION} · {fhrLabel}</small></span></div>
      <p className="disclaimer">STCI weights, midpoints and gates are <b>unverified hypotheses</b>. Synthetic demo inputs; not a tornado path or probability.</p>
      <section><h4>Weighted sub-indices</h4>
        <table className="ing"><tbody>
          {([['0–500 m SRH', `${fmt(stciInputs.srh500, 0)} m²/s²`, 'srh500'], ['Streamwise frac 0–500 m', fmt(stciInputs.streamwiseFrac500), 'streamwise'], ['0–3 km CAPE', `${fmt(stciInputs.cape03, 0)} J/kg`, 'cape03'],
            ['ML LCL', `${fmt(stciInputs.mllclM, 0)} m`, 'lcl'], ['Sfc–850 Td dep.', `${fmt(stciInputs.sfc850TdDep, 1)} °C`, 'tdDep'], ['Boundary θv grad', `${fmt(stciInputs.thetaVGrad, 1)} K/10km`, 'thetaV']] as const)
            .map(([k, v, key]) => <tr key={k}><td>{k}</td><td>{v}</td><td className="term">{fmt(stci.sub[key])} × w{STCI_WEIGHTS[key]}</td></tr>)}
        </tbody></table>
      </section>
      <section><h4>Gates</h4><p>EIL ×{fmt(stci.gates.eil)} · BWD {fmt(stciInputs.bwdMs, 1)} m/s ×{fmt(stci.gates.bwd)} · CIN ×{fmt(stci.gates.cin)}</p></section>
      </>)}
      <section><h4>Timing</h4><p>{def.timing}</p></section>
      <section><h4>Model disagreement <small>spread {fmt(spreadPct, 0)}%</small></h4>
        {perModel.map((p) => <div key={p.model} className="bar"><span>{p.model}</span><i style={{ width: `${(p.score / maxS) * 100}%` }} /><b>{fmt(p.score)}</b></div>)}
      </section>
      <section><h4>SPC comparison</h4>
        <p><b>Live SPC Day 1 at hotspot center:</b> {spcCat ? (liveCat.length ? liveCat.join(', ') : 'outside all categorical areas') : 'unavailable'}
          {spcTorn ? ` · tornado: ${liveTorn.length ? liveTorn.join(', ') : 'none'}` : ''}</p>
        <p className="muted">Note: live SPC is for today; demo hotspot is a synthetic case day, so mismatch is expected. Demo narrative: {def.spcContext}</p>
      </section>
      <section><h4>Analogs <DemoBadge small /></h4><ul>{def.analogs.map((a) => <li key={a.date}><b>{a.date}</b> — {a.note}</li>)}</ul></section>
      <section><p className="muted">{def.notes}</p></section>
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

const DEFAULT_CALC: WhirlInputs = { srh500: 200, effShearKt: 50, mlcape: 1500, mllclM: 900, mlcin: -30, mode: 'discrete', boundary: false };
export function CalculatorPanel() {
  const [v, setV] = useState<WhirlInputs>(DEFAULT_CALC);
  const r = computeWhirl(v);
  const num = (k: keyof WhirlInputs, label: string, min: number, max: number, step: number, unit: string) => (
    <label className="calc-row"><span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={v[k] as number} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
      <b>{v[k] as number} {unit}</b></label>
  );
  return (
    <div className="panel-body">
      <h3>WHIRL {WHIRL_VERSION} calculator</h3>
      <p className="muted">WHIRL = SRH500/75 × S<sub>shear</sub> × S<sub>CAPE</sub> × S<sub>LCL</sub> × S<sub>CIN</sub> × M<sub>mode</sub> × M<sub>boundary</sub>. Weights are untuned hypotheses.</p>
      {num('srh500', '0–500 m SRH', 0, 600, 5, 'm²/s²')}{num('effShearKt', 'Eff. shear', 0, 90, 1, 'kt')}
      {num('mlcape', 'MLCAPE', 0, 5000, 50, 'J/kg')}{num('mllclM', 'ML LCL', 200, 2500, 25, 'm')}{num('mlcin', 'MLCIN', -300, 0, 5, 'J/kg')}
      <label className="calc-row"><span>Storm mode</span>
        <select value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value as StormMode })}><option value="linear">likely linear ×0.5</option><option value="mixed">mixed ×1.0</option><option value="discrete">likely discrete ×1.25</option></select></label>
      <label className="calc-row"><span>Boundary</span><input type="checkbox" checked={v.boundary} onChange={(e) => setV({ ...v, boundary: e.target.checked })} /><b>{v.boundary ? '×1.2' : '×1.0'}</b></label>
      <div className={`score cat-${r.category}`}><b>{r.score.toFixed(2)}</b><span>{r.category}</span></div>
      <p className="muted">Draft scale: &lt;1 low-odds · 1–3 chaseable · 3+ high-end. Not a tornado probability.</p>
    </div>
  );
}
