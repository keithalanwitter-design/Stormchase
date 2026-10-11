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

import { RAINVIEWER_API, RADAR_REFRESH_MS, RADAR_MAX_FRAMES, rainviewerFrames, NHC_MAPSERVER, nhcLayerIds, type RadarFrame } from './lib/live';
import type { FeatureCollection, Feature } from 'geojson';

export function useRadarFrames(enabled = true) {
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try { const r = await fetch(RAINVIEWER_API, { cache: 'no-store' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const f = rainviewerFrames(await r.json()).slice(-RADAR_MAX_FRAMES); if (!f.length) throw new Error('no frames');
        if (alive) { setFrames(f); setError(null); setFetchedAt(new Date()); } }
      catch (e) { if (alive) setError((e as Error).message); }
    };
    void load(); const t = setInterval(load, RADAR_REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [enabled]);
  return { frames, error, fetchedAt };
}

/** NHC forecast cones/tracks for all active storms (empty collection when none). */
export function useNhc(enabled = true, intervalMs = 30 * 60_000) {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try {
        const ids = nhcLayerIds(await (await fetch(`${NHC_MAPSERVER}?f=json`)).json());
        const parts = await Promise.all(ids.map((id) => fetch(`${NHC_MAPSERVER}/${id}/query?where=1%3D1&outFields=*&f=geojson`).then((r) => r.json()).catch(() => null)));
        const features = parts.flatMap((p) => (p?.features ?? []) as Feature[]);
        if (alive) { setData({ type: 'FeatureCollection', features }); setError(null); }
      } catch (e) { if (alive) setError((e as Error).message); }
    };
    void load(); const t = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [enabled, intervalMs]);
  return { data, error };
}
