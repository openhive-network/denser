#!/usr/bin/env node
/**
 * Trim long arrays in recorded fixtures to keep committed size small.
 *
 * Currently trims:
 *   - bridge.get_ranked_posts: each post's `active_votes` to N entries.
 *     The seeded test user (CI_TEST_USER, default "guest4test") is
 *     preserved if present, so variant fixtures with prior-vote patches
 *     keep their checkVote lookup intact.
 *
 * Idempotent — running twice on the same dir is a no-op.
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
const VOTER = process.env.CI_TEST_USER || 'guest4test';

let totalFilesScanned = 0;
let totalFilesTrimmed = 0;
let totalEntriesRemoved = 0;

/**
 * Trim a single post's `active_votes`. Returns the number of entries
 * removed (0 if no trim needed → callers can detect idempotent runs).
 */
function trimActiveVotes(post) {
  if (
    !post ||
    typeof post !== 'object' ||
    !Array.isArray(post.active_votes) ||
    post.active_votes.length <= ACTIVE_VOTES_KEEP
  ) {
    return 0;
  }

  const before = post.active_votes.length;
  const seededEntry = post.active_votes.find((v) => v?.voter === VOTER);

  // Take the first N entries; if the seeded user wasn't in that head,
  // append it to keep `checkVote` truthy on variant fixtures that
  // injected the seeded vote.
  const head = post.active_votes.slice(0, ACTIVE_VOTES_KEEP);
  const seen = new Set(head.map((v) => v?.voter).filter(Boolean));
  const trimmed = [...head];
  if (seededEntry && !seen.has(VOTER)) {
    trimmed.push(seededEntry);
  }

  post.active_votes = trimmed;
  return before - trimmed.length;
}

function processFile(filePath) {
  totalFilesScanned++;
  const fileName = path.basename(filePath);
  if (!fileName.includes('bridge.get_ranked_posts')) return;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.warn(`Skipping ${filePath} — invalid JSON: ${err.message}`);
    return;
  }

  const posts = raw?.response?.result;
  if (!Array.isArray(posts)) return;

  let removed = 0;
  for (const post of posts) {
    removed += trimActiveVotes(post);
  }

  if (removed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n');
    totalFilesTrimmed++;
    totalEntriesRemoved += removed;
    const rel = path.relative(DEFAULT_FIXTURES_ROOT, filePath);
    console.log(
      `✓ ${rel} — trimmed ${removed} active_votes entries (kept ${ACTIVE_VOTES_KEEP}+seeded)`
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
    `removed ${totalEntriesRemoved} active_votes entries total.`
);
