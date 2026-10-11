/**
 * Configurable Chaser Feed list. Third-party content only — not affiliated with StormChase
 * and never used as a WHIRL data source. Add more accounts here AND in scripts/update-feed.mjs HANDLES.
 */
export interface Chaser {
  id: string; name: string; xHandle: string; note: string;
  /** Official NWS/NOAA account (labeled as official, still not WHIRL input). */
  official?: boolean;
  /** Verified live-stream URL; omit if none is verified. */
  liveUrl?: string;
}

export const CHASERS: Chaser[] = [
  { id: 'reed-timmer', name: 'Reed Timmer, PhD', xHandle: 'ReedTimmerUSA', note: 'Extreme meteorologist and storm chaser (Golden, CO).', liveUrl: 'https://www.youtube.com/channel/UCV6hWxB0-u_IX7e-h4fEBAw/live' },
  { id: 'ryan-hall', name: 'Ryan Hall, Y’all', xHandle: 'ryanhallyall', note: 'Severe-weather livestreams and coverage.', liveUrl: 'https://www.youtube.com/@RyanHallYall/live' },
  { id: 'max-velocity', name: 'Max Velocity', xHandle: 'MaxVelocityWX', note: 'Severe Weather Center forecasts and streams.', liveUrl: 'https://www.youtube.com/@MaxVelocityWX/live' },
  { id: 'stormnet', name: 'StormNet', xHandle: 'StormNetWx', note: 'Severe-weather threat outlooks.' },
  { id: 'nws-wpc', name: 'NWS Weather Prediction Center', xHandle: 'NWSWPC', note: 'Official NWS Weather Prediction Center (rainfall, MDs).', official: true },
];

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
export const isValidHandle = (h: string) => HANDLE_RE.test(h);
export const xProfileUrl = (h: string) => { if (!isValidHandle(h)) throw new Error(`Invalid X handle: ${h}`); return `https://x.com/${h}`; };
export const xTimelineUrl = (h: string) => { if (!isValidHandle(h)) throw new Error(`Invalid X handle: ${h}`); return `https://twitter.com/${h}?ref_src=twsrc%5Etfw`; };
export const WIDGETS_JS = 'https://platform.twitter.com/widgets.js';
export const EMBED_TIMEOUT_MS = 8000;

/* ---------- static JSON feed (docs/feed/chasers.json) ---------- */
export interface FeedPost { id: string; text: string; created_at: string; url: string; media_url?: string }
export interface FeedAccount { handle: string; name: string; posts: FeedPost[] }
export interface ChaserFeedJson { updated_utc: string; accounts: FeedAccount[] }

export const FEED_PATH = './feed/chasers.json';
export const FEED_REFRESH_MS = 2 * 60_000;
export const FEED_STALE_MS = 3 * 3600_000;

/** Page-relative feed URL with cache-busting (works under /Stormchase/ on Pages). */
export function feedUrl(base: string, now = Date.now()): string {
  const u = new URL(FEED_PATH, base); u.searchParams.set('t', String(Math.floor(now / 1000))); return u.toString();
}

/** Validate & sanitize untrusted feed JSON. Drops malformed posts and non-https links. */
export function parseFeed(raw: unknown): ChaserFeedJson | null {
  const r = raw as Partial<ChaserFeedJson> | null;
  if (!r || typeof r.updated_utc !== 'string' || Number.isNaN(Date.parse(r.updated_utc)) || !Array.isArray(r.accounts)) return null;
  const https = (s: unknown) => typeof s === 'string' && /^https:\/\//.test(s);
  const accounts = r.accounts.filter((a) => a && typeof a.handle === 'string' && isValidHandle(a.handle)).map((a) => ({
    handle: a.handle, name: typeof a.name === 'string' ? a.name : a.handle,
    posts: (Array.isArray(a.posts) ? a.posts : []).filter((p) => p && typeof p.id === 'string' && typeof p.text === 'string' && !Number.isNaN(Date.parse(p.created_at)) && https(p.url))
      .map((p) => ({ id: p.id, text: p.text, created_at: p.created_at, url: p.url, ...(https(p.media_url) ? { media_url: p.media_url } : {}) })),
  }));
  return { updated_utc: r.updated_utc, accounts };
}

export const isStale = (f: ChaserFeedJson | null, now = Date.now()) => !f || now - Date.parse(f.updated_utc) > FEED_STALE_MS;

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Flatten to newest-first post list, optionally for one handle. */
export function flattenPosts(f: ChaserFeedJson | null, handle?: string) {
  return (f?.accounts ?? []).filter((a) => !handle || a.handle === handle)
    .flatMap((a) => a.posts.map((p) => ({ ...p, handle: a.handle, name: a.name })))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/** Strip trailing t.co media links (the card shows the media separately). */
export const cleanText = (t: string) => t.replace(/\s*https:\/\/t\.co\/\w+\s*$/g, '').trim();
