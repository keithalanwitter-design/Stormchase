import { useEffect, useState } from 'react';
import { synthProfile, skewT, bunkersRight, helicity } from '../lib/sounding';
import type { Environment } from '../lib/scenario';

/** Animated arc gauge (value animates via CSS stroke-dashoffset transition). */
export function Gauge({ label, value, max, unit, good, invert, digits = 0 }: { label: string; value: number; max: number; unit: string; good: number; invert?: boolean; digits?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);
  const frac = Math.max(0, Math.min(1, (invert ? max - value : value) / max));
  const ok = invert ? value <= good : value >= good;
  const R = 34, C = Math.PI * R; // half circle
  return (
    <div className={`gauge ${ok ? 'ok' : ''}`}>
      <svg viewBox="0 0 84 50" aria-hidden>
        <path d="M8 46 A34 34 0 0 1 76 46" className="g-track" />
        <path d="M8 46 A34 34 0 0 1 76 46" className="g-val" style={{ strokeDasharray: C, strokeDashoffset: mounted ? C * (1 - frac) : C }} />
      </svg>
      <b>{value.toFixed(digits)}<small>{unit}</small></b>
      <span>{label}</span>
    </div>
  );
}

const ISOBARS = [1000, 850, 700, 500, 300, 200];
export function SoundingSvg({ env, compact }: { env: Environment; compact?: boolean }) {
  const prof = synthProfile(env);
  const W = 220, H = 220;
  const path = (key: 't' | 'td') => prof.filter((l) => l.p >= 200).map((l, i) => { const { x, y } = skewT(l[key], l.p, W, H); return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join('');
  const storm = bunkersRight(prof);
  const srh1 = helicity(prof, 1000, storm);
  const S = 3.2, cx = 110, cy = 110; // hodograph: px per m/s
  const hodo = prof.filter((l) => l.z <= 8000);
  const segColor = (z: number) => (z < 1000 ? '#ff2d6f' : z < 3000 ? '#ff9a1a' : z < 6000 ? '#f7c948' : '#4fd1ff');
  return (
    <div className={`sounding ${compact ? 'compact' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="skewt" role="img" aria-label="Synthetic skew-T sounding">
        <rect width={W} height={H} className="plot-bg" />
        {ISOBARS.map((p) => { const y = skewT(0, p, W, H).y; return <g key={p}><line x1={0} x2={W} y1={y} y2={y} className="grid" /><text x={2} y={y - 2} className="axis">{p}</text></g>; })}
        {[-40, -20, 0, 20, 40].map((t) => { const a = skewT(t, 1000, W, H), b = skewT(t, 200, W, H); return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={t === 0 ? 'grid zero' : 'grid'} />; })}
        <path d={path('t')} className="t-line draw" /><path d={path('td')} className="td-line draw" />
        <text x={W - 4} y={12} textAnchor="end" className="axis">Skew-T · SYNTHETIC</text>
      </svg>
      <svg viewBox="0 0 220 220" className="hodo" role="img" aria-label="Synthetic hodograph">
        <rect width={220} height={220} className="plot-bg" />
        {[10, 20, 30].map((r) => <circle key={r} cx={cx} cy={cy} r={r * S} className="grid" fill="none" />)}
        <line x1={0} x2={220} y1={cy} y2={cy} className="grid" /><line y1={0} y2={220} x1={cx} x2={cx} className="grid" />
        {hodo.slice(1).map((l, i) => { const a = hodo[i]; return <line key={l.z} x1={cx + a.u * S} y1={cy - a.v * S} x2={cx + l.u * S} y2={cy - l.v * S} stroke={segColor(a.z)} strokeWidth={3} strokeLinecap="round" className="draw" />; })}
        <circle cx={cx + storm.u * S} cy={cy - storm.v * S} r={4} className="storm-dot" />
        <text x={216} y={12} textAnchor="end" className="axis">Hodograph · 0–8 km</text>
        <text x={4} y={214} className="axis">0–1 km SRH ≈ {Math.round(srh1)} m²/s²</text>
      </svg>
      {!compact && <div className="legend small"><span><i style={{ background: '#ff4d4d' }} />T</span><span><i style={{ background: '#2ee86b' }} />Td</span><span><i style={{ background: '#ff2d6f' }} />0–1 km</span><span><i style={{ background: '#ff9a1a' }} />1–3</span><span><i style={{ background: '#f7c948' }} />3–6</span><span><i style={{ background: '#fff' }} />storm motion</span></div>}
    </div>
  );
}

export function TimelineChart({ series, others, fhr, onPick, max = 84 }: { series: { fhr: number; score: number }[]; others?: { id: string; series: { fhr: number; score: number }[] }[]; fhr: number; onPick?: (f: number) => void; max?: number }) {
  const W = 320, H = 120, P = 18;
  const top = Math.max(3, ...series.map((s) => s.score), ...(others ?? []).flatMap((o) => o.series.map((s) => s.score)));
  const X = (f: number) => P + (f / max) * (W - 2 * P), Y = (s: number) => H - P - (s / top) * (H - 2 * P);
  const line = (s: { fhr: number; score: number }[]) => s.map((p, i) => `${i ? 'L' : 'M'}${X(p.fhr).toFixed(1)},${Y(p.score).toFixed(1)}`).join('');
  const area = `${line(series)}L${X(max)},${Y(0)}L${X(0)},${Y(0)}Z`;
  const cur = series.reduce((a, b) => (Math.abs(b.fhr - fhr) < Math.abs(a.fhr - fhr) ? b : a), series[0]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tchart" role="img" aria-label="WHIRL by forecast hour"
      onClick={(e) => { if (!onPick) return; const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const f = ((e.clientX - r.left) / r.width * W - P) / (W - 2 * P) * max; onPick(Math.max(0, Math.min(max, Math.round(f)))); }}>
      <defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff2d6f" stopOpacity=".55" /><stop offset="1" stopColor="#ff2d6f" stopOpacity="0" /></linearGradient></defs>
      {[1, 3].map((v) => v <= top && <g key={v}><line x1={P} x2={W - P} y1={Y(v)} y2={Y(v)} className="grid dashed" /><text x={W - P + 2} y={Y(v) + 3} className="axis">{v}</text></g>)}
      {[0, 24, 48, 72].map((f) => <g key={f}><line x1={X(f)} x2={X(f)} y1={P} y2={H - P} className="grid" /><text x={X(f) + 2} y={H - 4} className="axis">Day {3 - f / 24}</text></g>)}
      {(others ?? []).map((o) => <path key={o.id} d={line(o.series)} className="other-line" />)}
      <path d={area} fill="url(#tg)" /><path d={line(series)} className="main-line" />
      <line x1={X(fhr)} x2={X(fhr)} y1={P - 6} y2={H - P} className="now-line" />
      <circle cx={X(cur.fhr)} cy={Y(cur.score)} r={4.5} className="now-dot" />
    </svg>
  );
}

/** Light haptic tick on supported phones (Android); no-op elsewhere. */
export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* ignore */ } };
