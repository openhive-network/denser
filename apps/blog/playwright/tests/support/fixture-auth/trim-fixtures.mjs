#!/usr/bin/env node
/**
 * Trim long arrays in recorded fixtures to keep committed size small.
 *
 * Trims, by file kind:
 *   - bridge.get_ranked_posts → each post's `active_votes` (post lists)
 *   - bridge.get_post         → the single post's `active_votes`
 *   - bridge.get_discussion   → each comment entry's `active_votes`
 *                               (entries are keyed by `<author>/<permlink>`)
 *   - database_api.list_votes → top-level `result.votes` (the SSR limit:1000
 *                               full-vote list for a post). The limit:1
 *                               look-up by votes-component already returns
 *                               <= 5 votes so it isn't touched.
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
 * Per-fixture-kind handlers. Each returns the number of entries removed.
 * Filename matchers are substring (record-time naming uses RPC method
 * names verbatim) — order doesn't matter; we route on the first match.
 */
const HANDLERS = [
  {
    label: 'bridge.get_ranked_posts',
    matches: (name) => name.includes('bridge.get_ranked_posts'),
    process: (raw) => {
      const posts = raw?.response?.result;
      if (!Array.isArray(posts)) return 0;
      let removed = 0;
      for (const post of posts) removed += trimActiveVotes(post);
      return removed;
    }
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
