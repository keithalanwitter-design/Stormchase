import { useEffect, useRef, useState } from 'react';
import { CHASERS, EMBED_TIMEOUT_MS, WIDGETS_JS, xProfileUrl, xTimelineUrl, type Chaser } from '../lib/chasers';
import { haptic } from './Viz';

type TW = { widgets?: { load: (el?: HTMLElement) => void } };
let widgetsPromise: Promise<void> | null = null;
/** Lazily inject X's official widgets.js once (only when the panel is opened). */
function loadWidgets(): Promise<void> {
  if (widgetsPromise) return widgetsPromise;
  widgetsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = WIDGETS_JS; s.async = true; s.charset = 'utf-8'; s.id = 'x-widgets-js';
    s.onload = () => resolve(); s.onerror = () => { widgetsPromise = null; reject(new Error('widgets.js blocked')); };
    document.body.appendChild(s);
  });
  return widgetsPromise;
}

type State = 'loading' | 'embedded' | 'fallback';

function Timeline({ c }: { c: Chaser }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>('loading');
  useEffect(() => {
    let done = false;
    const el = box.current!;
    el.innerHTML = '';
    const a = document.createElement('a');
    a.className = 'twitter-timeline'; a.href = xTimelineUrl(c.xHandle); a.textContent = `Posts by @${c.xHandle}`;
    a.setAttribute('data-theme', 'dark'); a.setAttribute('data-height', '520'); a.setAttribute('data-dnt', 'true');
    a.setAttribute('data-chrome', 'noheader transparent');
    el.appendChild(a);
    const check = setInterval(() => {
      const f = el.querySelector('iframe');
      if (f && f.offsetHeight > 120) { done = true; setState('embedded'); clearInterval(check); }
    }, 400);
    const to = setTimeout(() => { if (!done) { setState('fallback'); clearInterval(check); } }, EMBED_TIMEOUT_MS);
    loadWidgets().then(() => (window as unknown as { twttr?: TW }).twttr?.widgets?.load(el)).catch(() => { setState('fallback'); clearInterval(check); clearTimeout(to); });
    return () => { clearInterval(check); clearTimeout(to); };
  }, [c.xHandle]);
  return (
    <div className="chaser" data-testid={`chaser-${c.id}`} data-embed-state={state}>
      <div className="chaser-head">
        <div className="avatar" aria-hidden>{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
        <div><b>{c.name}</b><small>@{c.xHandle}</small></div>
        {state === 'loading' && <span className="chip-load">loading…</span>}
      </div>
      <div ref={box} className={`x-embed ${state === 'fallback' ? 'hidden' : ''}`} />
      {state === 'fallback' && (
        <div className="chaser-fallback" data-testid="chaser-fallback">
          <p>{c.note}</p>
          <p className="muted">The embedded X timeline didn’t load (X often blocks timelines for logged-out viewers or blockers). Open it directly instead:</p>
        </div>
      )}
      <div className="chaser-links">
        <a className="ghost" href={xProfileUrl(c.xHandle)} target="_blank" rel="noopener noreferrer" onClick={() => haptic()}>Open on X ↗</a>
        {c.liveUrl && <a className="ghost live" href={c.liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => haptic()}>● Watch live ↗</a>}
      </div>
    </div>
  );
}

export default function ChaserFeed() {
  return (
    <div className="panel-body chaser-feed">
      <h3>Chaser Feed <span className="third-badge">3RD-PARTY</span></h3>
      <p className="muted">Third-party content from X / YouTube, shown for reference and field awareness. Not affiliated with StormChase, not endorsed, and <b>not a source of WHIRL data</b>. Always follow official NWS warnings.</p>
      {CHASERS.map((c) => <Timeline key={c.id} c={c} />)}
    </div>
  );
}
