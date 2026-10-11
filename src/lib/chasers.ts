/**
 * Configurable Chaser Feed list. Third-party content only — not affiliated with StormChase
 * and never used as a WHIRL data source. Add more chasers here.
 */
export interface Chaser {
  id: string; name: string; xHandle: string; note: string;
  /** Verified live-stream URL; omit if none is verified. */
  liveUrl?: string;
}

export const CHASERS: Chaser[] = [
  {
    id: 'reed-timmer', name: 'Reed Timmer, PhD', xHandle: 'ReedTimmerUSA',
    note: 'Extreme meteorologist and storm chaser (Golden, CO). Field posts and live intercepts.',
    liveUrl: 'https://www.youtube.com/channel/UCV6hWxB0-u_IX7e-h4fEBAw/live',
  },
];

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
export const isValidHandle = (h: string) => HANDLE_RE.test(h);
export const xProfileUrl = (h: string) => { if (!isValidHandle(h)) throw new Error(`Invalid X handle: ${h}`); return `https://x.com/${h}`; };
/** URL used by X's official embedded-timeline anchor (twitter.com host is what widgets.js expects). */
export const xTimelineUrl = (h: string) => { if (!isValidHandle(h)) throw new Error(`Invalid X handle: ${h}`); return `https://twitter.com/${h}?ref_src=twsrc%5Etfw`; };
export const WIDGETS_JS = 'https://platform.twitter.com/widgets.js';
export const EMBED_TIMEOUT_MS = 8000;
