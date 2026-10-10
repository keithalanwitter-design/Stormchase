import { useState } from 'react';
import { PRESETS, narrate, scoreEnvironment, type Environment } from '../lib/scenario';
import type { StormMode } from '../lib/whirl';
import { SoundingSvg, haptic } from './Viz';
import { DemoBadge } from './Panels';

type NumKey = { [K in keyof Environment]: Environment[K] extends number ? K : never }[keyof Environment];
const SLIDERS: [NumKey, string, number, number, number, string][] = [
  ['srh500', '0–500 m SRH', 0, 500, 5, 'm²/s²'], ['esrh', 'Effective SRH', 0, 600, 5, 'm²/s²'], ['effShearKt', 'Eff. shear', 0, 90, 1, 'kt'],
  ['mlcape', 'MLCAPE', 0, 5000, 50, 'J/kg'], ['cape03', '0–3 km CAPE', 0, 200, 5, 'J/kg'], ['mllclM', 'ML LCL', 200, 2500, 25, 'm'],
  ['mlcin', 'MLCIN', -250, 0, 5, 'J/kg'], ['streamwiseFrac500', 'Streamwise frac', 0, 1, 0.01, ''], ['sfc850TdDep', 'Sfc–850 Td dep', 0, 12, 0.5, '°C'],
  ['thetaVGrad', 'θv gradient', 0, 6, 0.1, 'K/10km'],
];

export default function Playground() {
  const [env, setEnv] = useState<Environment>(PRESETS[0].env);
  const [preset, setPreset] = useState<string | null>(PRESETS[0].id);
  const s = scoreEnvironment(env);
  const set = (p: Partial<Environment>) => { setEnv({ ...env, ...p }); setPreset(null); };
  const bars = [
    { k: 'WHIRL v0.1', v: s.whirl.score, max: 6, d: 2 }, { k: 'STCI (hyp.)', v: s.stci.score, max: 10, d: 1 }, { k: 'STP', v: s.stp, max: 6, d: 2 },
  ];
  return (
    <div className="panel-body playground">
      <h3>WHIRL Playground <DemoBadge small /></h3>
      <div className="presets">{PRESETS.map((p) => (
        <button key={p.id} className={preset === p.id ? 'on' : ''} onClick={() => { haptic(12); setEnv(p.env); setPreset(p.id); }} title={p.blurb}>{p.name}</button>))}</div>
      <div className="cmp-bars">{bars.map((b) => (
        <div key={b.k} className="cbar"><span>{b.k}</span><div><i style={{ width: `${Math.min(100, (b.v / b.max) * 100)}%` }} /></div><b>{b.v.toFixed(b.d)}</b></div>))}</div>
      <ul className="narr">{narrate(env).map((n) => <li key={n}>{n}</li>)}</ul>
      <details className="pg-sound"><summary>Synthetic sounding & hodograph</summary><SoundingSvg env={env} compact /></details>
      {SLIDERS.map(([k, label, min, max, step, unit]) => (
        <label key={k} className="calc-row"><span>{label}</span>
          <input type="range" min={min} max={max} step={step} value={env[k]} onChange={(e) => set({ [k]: Number(e.target.value) } as Partial<Environment>)} />
          <b>{Number(env[k]).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)} {unit}</b></label>))}
      <label className="calc-row"><span>Storm mode</span>
        <select value={env.mode} onChange={(e) => set({ mode: e.target.value as StormMode })}><option value="linear">likely linear ×0.5</option><option value="mixed">mixed ×1.0</option><option value="discrete">likely discrete ×1.25</option></select></label>
      <label className="calc-row"><span>Boundary</span><input type="checkbox" checked={env.boundary} onChange={(e) => set({ boundary: e.target.checked })} /><b>{env.boundary ? '×1.2' : '×1.0'}</b></label>
      <p className="muted">WHIRL draft scale: &lt;1 low · 1–3 chaseable · 3+ high-end. STCI weights are unverified hypotheses. None of these are tornado probabilities.</p>
    </div>
  );
}
