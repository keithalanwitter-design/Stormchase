import { describe, it, expect } from 'vitest';
// @ts-expect-error plain ESM script without types
import { buildFeed, parseLoose } from '../scripts/update-feed.mjs';
describe('update-feed script', () => {
  it('parses wrapped tool output and maps media', () => {
    const raw = parseLoose('<wrapper>\n{"data":[{"id":"9","text":"t","created_at":"2026-10-10T00:00:00Z","url":"https://x.com/i/status/9","attachments":{"media_keys":["k"]}}],"includes":{"media":[{"media_key":"k","preview_image_url":"https://pbs.twimg.com/a.jpg"}]}}\nfooter');
    const f = buildFeed({ data: [{ id: '1', name: 'Reed', username: 'ReedTimmerUSA' }] }, { ReedTimmerUSA: raw }, new Date('2026-10-10T01:00:00Z'));
    expect(f.updated_utc).toBe('2026-10-10T01:00:00.000Z');
    expect(f.accounts[0]).toMatchObject({ handle: 'ReedTimmerUSA', name: 'Reed' });
    expect(f.accounts[0].posts[0].media_url).toBe('https://pbs.twimg.com/a.jpg');
  });
});
