import { useEffect, useRef, useState } from 'react';
import { CHASERS, EMBED_TIMEOUT_MS, WIDGETS_JS, xProfileUrl, xTimelineUrl, feedUrl, parseFeed, isStale, timeAgo, flattenPosts, cleanText, FEED_REFRESH_MS, type Chaser, type ChaserFeedJson } from '../lib/chasers';
import { fmtTime } from '../lib/feeds';
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

const initials = (n: string) => n.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function useChaserJson() {
  const [feed, setFeed] = useState<ChaserFeedJson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(feedUrl(document.baseURI), { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const f = parseFeed(await r.json());
        if (!f) throw new Error('invalid feed JSON');
        if (alive) { setFeed(f); setError(null); }
      } catch (e) { if (alive) setError((e as Error).message); }
      if (alive) setNow(Date.now());
    };
    void load();
    const t = setInterval(load, FEED_REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => { alive = false; clearInterval(t); clearInterval(tick); };
  }, []);
  return { feed, error, now };
}

function Links({ c }: { c: Chaser }) {
  return (
    <div className="chaser-links">
      <a className="ghost" href={xProfileUrl(c.xHandle)} target="_blank" rel="noopener noreferrer" onClick={() => haptic()}>@{c.xHandle} on X ↗</a>
      {c.liveUrl && <a className="ghost live" href={c.liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => haptic()}>● Watch live ↗</a>}
    </div>
  );
}

export default function ChaserFeed() {
  const { feed, error, now } = useChaserJson();
  const [who, setWho] = useState<string | 'all'>('all');
  const [embed, setEmbed] = useState(false);
  const stale = isStale(feed, now);
  const posts = flattenPosts(feed, who === 'all' ? undefined : who).slice(0, who === 'all' ? 25 : 5);
  const byHandle = (h: string) => CHASERS.find((c) => c.xHandle.toLowerCase() === h.toLowerCase());
  const sel = who === 'all' ? null : byHandle(who);
  return (
    <div className="panel-body chaser-feed" data-testid="chaser-feed" data-feed-state={feed ? (stale ? 'stale' : 'fresh') : error ? 'missing' : 'loading'}>
      <h3>Chaser Feed <span className="third-badge">3RD-PARTY</span></h3>
      <p className="muted">Public posts from X, shown for reference and field awareness. Not affiliated with or endorsed by StormChase and <b>not a source of WHIRL data</b>. Always follow official NWS warnings.</p>
      <div className={`feed-status ${stale ? 'warn' : ''}`}>
        {feed ? <>Feed updated <b>{timeAgo(feed.updated_utc, now)}</b> · {fmtTime(feed.updated_utc)}{stale && ' · may be out of date'}</> : error ? <>Feed unavailable ({error})</> : <>Loading feed…</>}
      </div>
      <div className="who-chips">
        <button className={who === 'all' ? 'on' : ''} onClick={() => { haptic(); setWho('all'); setEmbed(false); }}>All</button>
        {CHASERS.map((c) => <button key={c.id} className={who === c.xHandle ? 'on' : ''} onClick={() => { haptic(); setWho(c.xHandle); setEmbed(false); }}>{c.official && <span className="off-dot" title="Official NWS" />}{c.name.split(',')[0]}</button>)}
      </div>
      {sel && <div className="who-head"><div className="avatar" aria-hidden>{initials(sel.name)}</div><div><b>{sel.name}</b>{sel.official && <span className="official-badge">OFFICIAL NWS</span>}<small>@{sel.xHandle} · {sel.note}</small></div></div>}
      {(stale || !feed) && <div className="chaser-fallback" data-testid="chaser-fallback"><p className="muted">The cached feed is missing or out of date. Open accounts directly:</p>{(sel ? [sel] : CHASERS).map((c) => <Links key={c.id} c={c} />)}</div>}
      <div className="posts">
        {posts.map((p) => { const c = byHandle(p.handle); return (
          <article key={p.id} className="post" data-testid="post-card">
            <header><div className="avatar sm" aria-hidden>{initials(p.name)}</div><div><b>{p.name}</b>{c?.official && <span className="official-badge">OFFICIAL NWS</span>}<small>@{p.handle} · <time dateTime={p.created_at} title={fmtTime(p.created_at)}>{timeAgo(p.created_at, now)}</time></small></div></header>
            <p>{cleanText(p.text)}</p>
            {p.media_url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="post-media"><img src={p.media_url} alt="" loading="lazy" referrerPolicy="no-referrer" /></a>}
            <a className="post-link" href={p.url} target="_blank" rel="noopener noreferrer">View on X ↗</a>
          </article>); })}
        {feed && posts.length === 0 && <p className="muted">No cached posts for this account.</p>}
      </div>
      {sel && !stale && feed && <Links c={sel} />}
      {sel && (<div className="embed-opt">
        <button className="ghost" onClick={() => { haptic(); setEmbed(!embed); }}>{embed ? 'Hide' : 'Try'} live X timeline embed (optional)</button>
        {embed && <Timeline c={sel} />}
      </div>)}
    </div>
  );
}
