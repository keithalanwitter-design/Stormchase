import { useMemo, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { HOTSPOT_DEFS, MODELS, whirlSeries, dayLabel, type HotspotDetail, type ModelId } from '../data/demo';
import { labelsAt } from '../lib/geo';
import { WHIRL_VERSION } from '../lib/whirl';
import { STCI_VERSION } from '../lib/stci';
import { narrate } from '../lib/scenario';
import { Gauge, SoundingSvg, TimelineChart, haptic } from './Viz';
import { DemoBadge } from './Panels';

export const TABS = ['Ingredients', 'Sounding', 'Timeline', 'Models', 'SPC', 'Analogs', 'Chase plan'] as const;
export type Tab = (typeof TABS)[number];
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');

export default function EvidenceCard({ d, model, fhr, setFhr, spcCat, spcTorn, onClose, fhrLabel, expanded, setExpanded, onFlyTo, initialTab }: {
  d: HotspotDetail; model: ModelId; fhr: number; setFhr: (f: number) => void; spcCat: FeatureCollection | null; spcTorn: FeatureCollection | null;
  onClose: () => void; fhrLabel: string; expanded: boolean; setExpanded: (b: boolean) => void; onFlyTo: (lonlat: [number, number]) => void; initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'Ingredients');
  const { def, env, scores, perModel, spreadPct } = d;
  const w = scores.whirl;
  const series = useMemo(() => whirlSeries(def, model, 1), [def, model]);
  const otherSeries = useMemo(() => MODELS.filter((m) => m.id !== model).map((m) => ({ id: m.id, series: whirlSeries(def, m.id, 2) })), [def, model]);
  const liveCat = labelsAt(def.center, spcCat), liveTorn = labelsAt(def.center, spcTorn);
  const peak = series.reduce((a, b) => (b.score > a.score ? b : a));
  const maxS = Math.max(...perModel.map((p) => p.score), 0.01);
  const pick = (t: Tab) => { haptic(); setTab(t); };
  return (
    <div className={`card ${expanded ? 'expanded' : ''}`} role="dialog" aria-label={`${def.name} evidence card`} data-testid="hotspot-card">
      <button className="sheet-handle" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse card' : 'Expand card'}><i /></button>
      <div className="card-head">
        <div><div className="eyebrow">{def.region} · WHIRL-E favorability <DemoBadge small /></div><h2>{def.name}</h2></div>
        <button className="icon" onClick={onClose} aria-label="Close card">✕</button>
      </div>
      <div className="score-row">
        <div className={`score cat-${w.category}`}><b key={w.score.toFixed(1)} className="pop">{fmt(w.score)}</b><span>WHIRL · {w.category}<br /><small>{WHIRL_VERSION}</small></span></div>
        <div className="chips"><span>STCI <b>{fmt(scores.stci.score, 1)}</b>/10</span><span>STP <b>{fmt(scores.stp)}</b></span><span>{dayLabel(fhr)}</span></div>
      </div>
      <p className="disclaimer">Synthetic demo region · environmental favorability, <b>not a tornado path</b>, not a warning or probability. {fhrLabel}</p>
      <nav className="card-tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => pick(t)}>{t}</button>)}</nav>
      <div className="tab-body" key={tab}>
        {tab === 'Ingredients' && (<>
          <div className="gauges">
            <Gauge label="0–500 m SRH" value={env.srh500} max={400} unit="m²/s²" good={150} />
            <Gauge label="Eff. shear" value={env.effShearKt} max={80} unit="kt" good={40} />
            <Gauge label="MLCAPE" value={env.mlcape} max={4500} unit="J/kg" good={1000} />
            <Gauge label="ML LCL" value={env.mllclM} max={2000} unit="m" good={1000} invert />
            <Gauge label="MLCIN" value={-env.mlcin} max={200} unit="J/kg" good={50} invert />
            <Gauge label="Streamwise 0–500" value={env.streamwiseFrac500 * 100} max={100} unit="%" good={65} />
            <Gauge label="0–3 km CAPE" value={env.cape03} max={150} unit="J/kg" good={65} />
          </div>
          <table className="ing"><tbody>
            {([['SRH500/75', w.terms.srhTerm], ['S shear', w.terms.sShear], ['S CAPE', w.terms.sCape], ['S LCL', w.terms.sLcl], ['S CIN', w.terms.sCin], [`Mode (${env.mode})`, w.terms.mMode], [`Boundary (${env.boundary ? 'yes' : 'no'})`, w.terms.mBoundary]] as const)
              .map(([k, t]) => <tr key={k}><td>{k}</td><td className="term"><span className="tbar" style={{ width: `${Math.min(100, (t / 3) * 100)}%` }} />×{fmt(t)}</td></tr>)}
          </tbody></table>
          <ul className="narr">{narrate(env).slice(1).map((n) => <li key={n}>{n}</li>)}</ul>
        </>)}
        {tab === 'Sounding' && (<><SoundingSvg env={env} /><p className="muted">Synthetic profile generated from this hotspot’s demo ingredients — illustrative only, not model output.</p></>)}
        {tab === 'Timeline' && (<>
          <TimelineChart series={series} others={otherSeries} fhr={fhr} onPick={(f) => { haptic(); setFhr(f); }} />
          <p className="muted">Tap the chart to jump. Bold = {model}; faint = other demo models. Peak WHIRL {fmt(peak.score)} at F{String(peak.fhr).padStart(3, '0')} ({dayLabel(peak.fhr)}).</p>
          <p>{def.timing}</p>
        </>)}
        {tab === 'Models' && (<>
          {perModel.map((p) => <div key={p.model} className="bar"><span>{p.model}</span><i style={{ width: `${(p.score / maxS) * 100}%` }} /><b>{fmt(p.score)}</b></div>)}
          <table className="ing"><thead><tr><td>Model</td><td>WHIRL</td><td>STCI</td><td>STP</td></tr></thead><tbody>
            {perModel.map((p) => <tr key={p.model}><td>{p.model}</td><td>{fmt(p.score)}</td><td>{fmt(p.stci, 1)}</td><td>{fmt(p.stp)}</td></tr>)}</tbody></table>
          <p className="muted">Spread {fmt(spreadPct, 0)}% of the mean — {spreadPct > 50 ? 'large disagreement, low confidence' : spreadPct > 25 ? 'moderate disagreement' : 'models broadly agree'}. STCI ({STCI_VERSION}) weights are unverified hypotheses.</p>
        </>)}
        {tab === 'SPC' && (<>
          <p><b>Live SPC Day 1 at hotspot center:</b> {spcCat ? (liveCat.length ? liveCat.join(', ') : 'outside all categorical areas') : 'unavailable'}{spcTorn ? ` · tornado: ${liveTorn.length ? liveTorn.join(', ') : 'none'}` : ''}</p>
          <p className="muted">Live SPC is for today; this demo case is synthetic, so a mismatch is expected.</p>
          <p><DemoBadge small /> {def.spcContext}</p>
        </>)}
        {tab === 'Analogs' && (<ul className="analogs">{def.analogs.map((a) => <li key={a.date}><div><b>{a.date}</b><span>{a.note}</span></div><i style={{ width: `${a.similarity * 100}%` }} /><small>{Math.round(a.similarity * 100)}% similar (demo)</small></li>)}</ul>)}
        {tab === 'Chase plan' && (<div className="chase">
          <div className="kv"><span>Target</span><b>{def.chase.target}</b><span>Depart</span><b>{def.chase.depart}</b><span>Route</span><b>{def.chase.route}</b></div>
          <button className="ghost" onClick={() => { haptic(); onFlyTo(def.chase.targetLonLat); }}>📍 Show target on map</button>
          <h4>Safety</h4><ul>{def.chase.safety.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="muted">Demo plan for a fictional case. Real chase decisions: follow NWS/SPC, never chase into the core, and have an escape route.</p>
        </div>)}
      </div>
      <div className="hs-switch">{HOTSPOT_DEFS.map((h) => <span key={h.id} className={h.id === def.id ? 'on' : ''} />)}</div>
    </div>
  );
}
