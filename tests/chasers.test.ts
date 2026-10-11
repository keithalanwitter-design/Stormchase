import { describe, it, expect } from 'vitest';
import { CHASERS, isValidHandle, xProfileUrl, xTimelineUrl, parseFeed, isStale, timeAgo, flattenPosts, feedUrl, cleanText } from '../src/lib/chasers';
import feed from '../docs/feed/chasers.json';

describe('chaser config', () => {
  it('has the five verified accounts, NWSWPC marked official', () => {
    expect(CHASERS.map((c) => c.xHandle)).toEqual(['ReedTimmerUSA', 'ryanhallyall', 'MaxVelocityWX', 'StormNetWx', 'NWSWPC']);
    expect(CHASERS.filter((c) => c.official).map((c) => c.xHandle)).toEqual(['NWSWPC']);
    for (const c of CHASERS) { expect(isValidHandle(c.xHandle)).toBe(true); if (c.liveUrl) expect(c.liveUrl).toMatch(/^https:\/\/www\.youtube\.com\//); }
    expect(CHASERS.find((c) => c.xHandle === 'StormNetWx')?.liveUrl).toBeUndefined();
  });
  it('builds URLs and rejects bad handles', () => {
    expect(xProfileUrl('ReedTimmerUSA')).toBe('https://x.com/ReedTimmerUSA');
    expect(xTimelineUrl('ReedTimmerUSA')).toContain('twitter.com/ReedTimmerUSA');
    expect(() => xProfileUrl('bad handle"><script>')).toThrow();
  });
});

describe('feed JSON', () => {
  it('feed URL is page-relative with cache-busting', () => {
    expect(feedUrl('https://keithalanwitter-design.github.io/Stormchase/', 1_700_000_000_000)).toBe('https://keithalanwitter-design.github.io/Stormchase/feed/chasers.json?t=1700000000');
  });
  it('committed docs/feed/chasers.json is valid and every account maps to a configured chaser', () => {
    const f = parseFeed(feed)!; expect(f).not.toBeNull();
    for (const a of f.accounts) expect(CHASERS.some((c) => c.xHandle === a.handle)).toBe(true);
    expect(flattenPosts(f).length).toBeGreaterThan(0);
  });
  it('sanitizes malformed / unsafe entries', () => {
    const f = parseFeed({ updated_utc: '2026-10-10T00:00:00Z', accounts: [
      { handle: 'ok_one', name: 'OK', posts: [
        { id: '1', text: 'hi', created_at: '2026-10-10T00:00:00Z', url: 'https://x.com/i/status/1', media_url: 'javascript:alert(1)' },
        { id: '2', text: 'bad', created_at: 'nope', url: 'https://x.com/i/status/2' },
        { id: '3', text: 'bad', created_at: '2026-10-10T00:00:00Z', url: 'http://evil' }] },
      { handle: 'bad handle!', name: 'x', posts: [] }] })!;
    expect(f.accounts).toHaveLength(1); expect(f.accounts[0].posts).toHaveLength(1); expect(f.accounts[0].posts[0].media_url).toBeUndefined();
    expect(parseFeed({ accounts: [] })).toBeNull(); expect(parseFeed(null)).toBeNull();
  });
  it('staleness, time ago, ordering, text cleanup', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    expect(isStale(null, now)).toBe(true);
    expect(isStale({ updated_utc: '2026-10-10T11:00:00Z', accounts: [] }, now)).toBe(false);
    expect(isStale({ updated_utc: '2026-10-10T08:00:00Z', accounts: [] }, now)).toBe(true);
    expect(timeAgo('2026-10-10T11:55:00Z', now)).toBe('5 min ago'); expect(timeAgo('2026-10-10T09:00:00Z', now)).toBe('3 h ago');
    const fl = flattenPosts({ updated_utc: 'x', accounts: [{ handle: 'a', name: 'A', posts: [{ id: '1', text: '', created_at: '2026-10-09T00:00:00Z', url: 'https://x' }] }, { handle: 'b', name: 'B', posts: [{ id: '2', text: '', created_at: '2026-10-10T00:00:00Z', url: 'https://x' }] }] });
    expect(fl.map((p) => p.id)).toEqual(['2', '1']);
    expect(cleanText('Big storm https://t.co/abc123')).toBe('Big storm');
  });
});
