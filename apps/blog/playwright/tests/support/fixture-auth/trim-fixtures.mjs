#!/usr/bin/env node
/**
 * Trim long arrays in recorded fixtures to keep committed size small.
 *
 * Trims, by file kind:
 *   - bridge.get_ranked_posts  → each post's `active_votes` + `body`
 *                                (trending / feed post lists)
 *   - bridge.get_account_posts → each post's `active_votes` + `body`
 *                                (profile blog feed)
 *   - search-api.find_text     → each result's `active_votes` + `body`
 *                                (classic search results)
 *   - bridge.list_communities  → community-list length (COMMUNITY_KEEP)
 *                                (the trending-communities sidebar)
 *   - condenser_api.get_following → following-list length (FOLLOW_LIST_KEEP)
 *                                (header follow-state list; not asserted on)
 *   - bridge.get_post          → the single post's `active_votes`
 *   - bridge.get_discussion    → each comment entry's `active_votes`
 *                                (entries are keyed by `<author>/<permlink>`)
 *   - database_api.list_votes  → top-level `result.votes` (the SSR limit:1000
 *                                full-vote list for a post). The limit:1
 *                                look-up by votes-component already returns
 *                                <= 5 votes so it isn't touched.
 *
 * Post feeds are trimmed by TRUNCATING `body` (the bulk) and `active_votes`
 * while keeping every post — list components render a line-clamped summary, so
 * card height (and thus the infinite-scroll sentinel position) is unchanged.
 * Dropping posts would shrink the page, trip the sentinel, and auto-fire an
 * un-recorded next-page fetch (fixture MISS). Only the two NON-paginating
 * lists (communities sidebar, follow-state list) are head-sliced by length;
 * specs assert nothing on them and they have no scroll sentinel.
 *
 * The seeded test user (CI_TEST_USER, default "guest4test") is preserved
 * if present in the head being trimmed — so variant fixtures with
 * prior-vote patches keep their checkVote lookup intact across re-runs.
 *
 * Idempotent — re-running on already-trimmed fixtures is a no-op.
 *
 * Wired into package.json's `test:fixture:record` chain so it runs
 * automatically after every recording. Run manually with:
 *
 *     node trim-fixtures.mjs                  # trims everything under mock/fixtures/
 *     node trim-fixtures.mjs <fixture-dir>    # trims a specific dir / file
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURES_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  'mock',
  'fixtures'
);

const ACTIVE_VOTES_KEEP = 5;
const LIST_VOTES_KEEP = 5;
// Post `body` markdown dominates each feed entry (~85% of its bytes). We
// truncate it rather than dropping whole posts: the feed list components
// render a line-clamped summary (fixed card height) so a shorter body keeps
// the rendered page height — and therefore the infinite-scroll sentinel
// position — unchanged. Dropping posts instead would shrink the page, pull
// the sentinel into view, and auto-fire an un-recorded next-page fetch (a
// fixture MISS). 600 chars preserves the card summary + first inline image.
const BODY_KEEP_CHARS = 600;
// List-length caps for NON-paginating lists only (sidebar communities, the
// header follow-state list). Specs don't assert on these, and they have no
// infinite-scroll sentinel, so head-slicing them is behaviour-safe.
const COMMUNITY_KEEP = 10;
const FOLLOW_LIST_KEEP = 5;
const VOTER = process.env.CI_TEST_USER || 'guest4test';

let totalFilesScanned = 0;
let totalFilesTrimmed = 0;
let totalEntriesRemoved = 0;

/**
 * Generic trimmer for any "vote-list shaped" array on a host object.
 * The host has a property `key` whose value is an array. We keep the
 * first `keep` entries, plus the seeded user if it would have been
 * dropped — preserving `checkVote` semantics for variant overlays.
 */
function trimVoteArray(host, key, keep) {
  if (
    !host ||
    typeof host !== 'object' ||
    !Array.isArray(host[key]) ||
    host[key].length <= keep
  ) {
    return 0;
  }

  const before = host[key].length;
  const seededEntry = host[key].find((v) => v?.voter === VOTER);
  const head = host[key].slice(0, keep);
  const seen = new Set(head.map((v) => v?.voter).filter(Boolean));
  const trimmed = [...head];
  if (seededEntry && !seen.has(VOTER)) {
    trimmed.push(seededEntry);
  }
  host[key] = trimmed;
  return before - trimmed.length;
}

const trimActiveVotes = (post) =>
  trimVoteArray(post, 'active_votes', ACTIVE_VOTES_KEEP);

/**
 * Head-slice an array property on `host` to at most `keep` entries.
 * Order-preserving (keeps the first `keep`) so index-0 pins in specs
 * survive. Returns the number of entries removed.
 */
function trimArrayLength(host, key, keep) {
  if (
    !host ||
    typeof host !== 'object' ||
    !Array.isArray(host[key]) ||
    host[key].length <= keep
  ) {
    return 0;
  }
  const before = host[key].length;
  host[key] = host[key].slice(0, keep);
  return before - host[key].length;
}

/** Truncate a post's `body` markdown to BODY_KEEP_CHARS. Returns chars removed. */
function trimPostBody(post) {
  if (
    !post ||
    typeof post !== 'object' ||
    typeof post.body !== 'string' ||
    post.body.length <= BODY_KEEP_CHARS
  ) {
    return 0;
  }
  const before = post.body.length;
  post.body = post.body.slice(0, BODY_KEEP_CHARS);
  return before - post.body.length;
}

/**
 * Trim a post/result feed in place: truncate each entry's `body` and trim its
 * `active_votes` — WITHOUT changing the list length (preserves infinite-scroll
 * behaviour, see BODY_KEEP_CHARS). Shared by get_ranked_posts /
 * get_account_posts / find_text, whose `response.result` is the post array.
 */
function trimPostFeed(raw) {
  const posts = raw?.response?.result;
  if (!Array.isArray(posts)) return 0;
  let removed = 0;
  for (const post of posts) {
    removed += trimActiveVotes(post);
    removed += trimPostBody(post);
  }
  return removed;
}

/**
 * Per-fixture-kind handlers. Each returns the number of entries removed.
 * Filename matchers are substring (record-time naming uses RPC method
 * names verbatim) — order doesn't matter; we route on the first match.
 */
const HANDLERS = [
  {
    label: 'bridge.get_ranked_posts',
    matches: (name) => name.includes('bridge.get_ranked_posts'),
    process: (raw) => trimPostFeed(raw)
  },
  {
    label: 'bridge.get_account_posts',
    matches: (name) => name.includes('bridge.get_account_posts'),
    process: (raw) => trimPostFeed(raw)
  },
  {
    label: 'search-api.find_text',
    matches: (name) => name.includes('search-api.find_text'),
    process: (raw) => trimPostFeed(raw)
  },
  {
    label: 'bridge.list_communities',
    matches: (name) => name.includes('bridge.list_communities'),
    process: (raw) => trimArrayLength(raw?.response, 'result', COMMUNITY_KEEP)
  },
  {
    label: 'condenser_api.get_following',
    matches: (name) => name.includes('condenser_api.get_following'),
    process: (raw) => trimArrayLength(raw?.response, 'result', FOLLOW_LIST_KEEP)
  },
  {
    label: 'bridge.get_post',
    matches: (name) => name.includes('bridge.get_post'),
    process: (raw) => trimActiveVotes(raw?.response?.result)
  },
  {
    label: 'bridge.get_discussion',
    matches: (name) => name.includes('bridge.get_discussion'),
    process: (raw) => {
      const result = raw?.response?.result;
      if (!result || typeof result !== 'object') return 0;
      let removed = 0;
      for (const key of Object.keys(result)) removed += trimActiveVotes(result[key]);
      return removed;
    }
  },
  {
    label: 'database_api.list_votes',
    matches: (name) => name.includes('database_api.list_votes'),
    process: (raw) =>
      trimVoteArray(raw?.response?.result, 'votes', LIST_VOTES_KEEP)
  }
];

function processFile(filePath) {
  totalFilesScanned++;
  const fileName = path.basename(filePath);
  const handler = HANDLERS.find((h) => h.matches(fileName));
  if (!handler) return;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.warn(`Skipping ${filePath} — invalid JSON: ${err.message}`);
    return;
  }

  const removed = handler.process(raw);
  if (removed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n');
    totalFilesTrimmed++;
    totalEntriesRemoved += removed;
    const rel = path.relative(DEFAULT_FIXTURES_ROOT, filePath);
    console.log(
      `✓ ${rel} — ${handler.label}: trimmed ${removed} entries`
    );
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      processFile(full);
    }
  }
}

const targetArg = process.argv[2];
const target = targetArg ? path.resolve(targetArg) : DEFAULT_FIXTURES_ROOT;

if (!fs.existsSync(target)) {
  console.error(`Path not found: ${target}`);
  process.exit(1);
}

const stat = fs.statSync(target);
if (stat.isDirectory()) {
  walkDir(target);
} else {
  processFile(target);
}

console.log(
  `\nDone — scanned ${totalFilesScanned} files, trimmed ${totalFilesTrimmed}, ` +
    `removed ${totalEntriesRemoved} entries total.`
);
