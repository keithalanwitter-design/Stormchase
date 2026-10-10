import { useCallback, useEffect, useState } from 'react';
import { fetchGeoJSON, type FeedResult } from './lib/feeds';

/** Poll a GeoJSON feed; keeps last good data on error. */
export function useFeed(url: string, intervalMs: number, enabled = true) {
  const [state, setState] = useState<FeedResult & { loading: boolean }>({ data: null, fetchedAt: new Date(0), lastModified: null, error: null, via: 'none', loading: true });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const r = await fetchGeoJSON(url);
    setState((s) => ({ ...r, data: r.data ?? s.data, loading: false }));
  }, [url]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const run = () => { if (alive) void load(); };
    run();
    const t = setInterval(run, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [load, intervalMs, enabled]);
  return { ...state, reload: load };
}

export function useIsMobile(bp = 820) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => { const f = () => setM(window.innerWidth < bp); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [bp]);
  return m;
}
