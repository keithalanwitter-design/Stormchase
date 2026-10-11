#!/usr/bin/env node
/**
 * Regenerate docs/feed/chasers.json from raw X API responses.
 *
 * Inputs (default dir .feed-raw/, override with FEED_RAW_DIR):
 *   users.json      — response of x.get_users_by_usernames({usernames:[...CHASERS handles]})
 *   <handle>.json   — response of x.get_users_posts({id, max_results:5, exclude:"replies,retweets",
 *                     "post.fields":"created_at,attachments", expansions:"attachments.media_keys",
 *                     "media.fields":"url,preview_image_url,type"})
 * Files may contain wrapper text around the JSON; the first {...} line is parsed.
 *
 * Output: docs/feed/chasers.json  {updated_utc, accounts:[{handle,name,posts:[{id,text,created_at,url,media_url?}]}]}
 * Writes only when the account/post content changed (updated_utc alone never triggers a write).
 * Exit code 0 = written ("CHANGED"), 3 = unchanged ("UNCHANGED"), 1 = error.
 * With --commit: git add/commit/push docs/feed/chasers.json when changed.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const RAW = process.env.FEED_RAW_DIR ?? '.feed-raw';
const OUT = process.env.FEED_OUT ?? 'docs/feed/chasers.json';
const HANDLES = ['ReedTimmerUSA', 'ryanhallyall', 'MaxVelocityWX', 'StormNetWx', 'NWSWPC']; // keep in sync with src/lib/chasers.ts

export function parseLoose(txt) {
  const line = txt.split('\n').find((l) => l.trim().startsWith('{'));
  if (!line) throw new Error('no JSON object found');
  return JSON.parse(line);
}

export function buildFeed(users, postsByHandle, now = new Date()) {
  const accounts = HANDLES.map((h) => {
    const u = users.data?.find((x) => x.username.toLowerCase() === h.toLowerCase());
    const raw = postsByHandle[h];
    const media = new Map((raw?.includes?.media ?? []).map((m) => [m.media_key, m.url ?? m.preview_image_url]));
    const posts = (raw?.data ?? []).slice(0, 5).map((p) => {
      const mk = p.attachments?.media_keys?.find((k) => media.get(k));
      const post = { id: p.id, text: p.text, created_at: p.created_at, url: p.url ?? `https://x.com/${h}/status/${p.id}` };
      if (mk) post.media_url = media.get(mk);
      return post;
    });
    return { handle: u?.username ?? h, name: u?.name ?? h, posts };
  });
  return { updated_utc: now.toISOString(), accounts };
}

const contentKey = (f) => JSON.stringify(f.accounts);

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const users = parseLoose(readFileSync(path.join(RAW, 'users.json'), 'utf8'));
    const postsByHandle = {};
    for (const h of HANDLES) { const f = path.join(RAW, `${h}.json`); if (existsSync(f)) postsByHandle[h] = parseLoose(readFileSync(f, 'utf8')); }
    const next = buildFeed(users, postsByHandle);
    const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
    if (prev && contentKey(prev) === contentKey(next)) { console.log('UNCHANGED'); process.exit(3); }
    mkdirSync(path.dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
    console.log(`CHANGED: ${next.accounts.map((a) => `${a.handle}=${a.posts.length}`).join(' ')}`);
    if (process.argv.includes('--commit')) {
      execSync(`git add ${OUT} && git commit -m "feed: update chasers.json ${next.updated_utc}" && git push origin main`, { stdio: 'inherit' });
    }
  } catch (e) { console.error('update-feed failed:', e.message); process.exit(1); }
}
