import { describe, it, expect } from 'vitest';
import { CHASERS, isValidHandle, xProfileUrl, xTimelineUrl } from '../src/lib/chasers';
describe('chaser feed config', () => {
  it('starts with Reed Timmer only, valid unique entries', () => {
    expect(CHASERS.map((c) => c.xHandle)).toEqual(['ReedTimmerUSA']);
    expect(new Set(CHASERS.map((c) => c.id)).size).toBe(CHASERS.length);
    for (const c of CHASERS) { expect(isValidHandle(c.xHandle)).toBe(true); if (c.liveUrl) expect(c.liveUrl).toMatch(/^https:\/\/(www\.)?youtube\.com\//); }
  });
  it('builds URLs and rejects bad handles', () => {
    expect(xProfileUrl('ReedTimmerUSA')).toBe('https://x.com/ReedTimmerUSA');
    expect(xTimelineUrl('ReedTimmerUSA')).toContain('twitter.com/ReedTimmerUSA');
    expect(() => xProfileUrl('bad handle"><script>')).toThrow();
    expect(isValidHandle('a'.repeat(16))).toBe(false);
  });
});
