#!/usr/bin/env node
/**
 * Generates fixture dirs for "user has already upvoted / downvoted" test
 * preconditions by writing overlay variants on top of a freshly-recorded
 * `postVoting/` base dir.
 *
 * Why this exists: SSR-rendered Next.js pages fetch chain data inside the
 * server process, so Playwright's `page.route` cannot intercept/override
 * those responses. The cleanest way to seed "user already voted" state is
 * therefore to prepare a separate fixture dir with pre-patched responses
 * and switch `fixtureTestName` per `test.describe`.
 *
 * Overlay layout (post-MR !1077 reduction, issue #2179)
 * ---------------------------------------------------------
 * Variant dirs now commit **only the fixture files whose response differs**
 * from the base. An `_index.json` with `{ "base": "postVoting" }` tells
 * the fixture-proxy's `loadFixtures` to pull the remaining files from the
 * base dir and let the variant's own files override by request hash. This
 * drops committed size from ~8 MB (6 full copies) to ~1.4 MB total.
 *
 * Base file `0005-bridge.get_ranked_posts.json` is additionally trimmed
 * at generation time: each post's `active_votes` array is cut down to at
 * most TRIMMED_VOTERS_PER_POST entries, plus the seeded voter if present.
 * The blog's list view only consults `active_votes` via `checkVote`
 * (`votes-component.tsx:72`) for the current user — voter counts and
 * payouts come from `post.stats.total_votes`, which is untouched.
 *
 * Usage:
 *   1) Record base fixtures once:
 *        pnpm --filter @hive/blog test:fixture:record -- postVoting
 *      (record runs the VOTE-01/03 describe — the one scoped to `postVoting`)
 *   2) Regenerate the pre-voted variants from the base:
 *        node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 *   3) Replay all post-voting tests:
 *        pnpm --filter @hive/blog test:fixture -- postVoting
 *
 * The generator also applies the `active_votes` trim to the committed
 * `postVoting/0005-bridge.get_ranked_posts.json` in-place; it is idempotent
 * (re-running after trimming is a no-op) and safe — the trim never removes
 * the seeded voter.
 *
 * Only these fixture files ever appear in a variant dir:
 *   - bridge.get_ranked_posts: inject VOTER as a voter on the first post
 *     (needed for the component's `checkVote` to be truthy, which enables
 *     the `list_votes` query on initial render).
 *   - database_api.list_votes: return a single vote by VOTER with the
 *     appropriate vote_percent (±10000 / ±5000), so the component flips
 *     into its "already voted" branch and renders VoteRemovalDialog.
 *   - database_api.find_accounts (highHP only): bump `vesting_shares` so
 *     the UI computes `net_vests > 1M` and enables the vote slider.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(
  __dirname,
  '..',
  '..',
  'mock',
  'fixtures'
);

const BASE_DIR = 'postVoting';
const VOTER = process.env.CI_TEST_USER || 'guest4test';

// Keep enough entries for the sort/display heuristics that show the
// top few voters, but trim the long tail. `checkVote` only cares about
// the seeded voter, which is always preserved when present.
const TRIMMED_VOTERS_PER_POST = 3;

// 50M VESTS — comfortably above VOTE_WEIGHT_DROPDOWN_THRESHOLD (1M) and
// well within realistic mainnet whale magnitudes, so the UI's derived
// displays (manabar, reputation etc.) don't look absurd.
const HIGH_HP_VESTING_AMOUNT = '50000000000000';

/**
 * Variants opt in to patches via flags:
 *   - priorVote: { votePercent, rshares } — patch active_votes +
 *     list_votes so UI renders "already voted" state (VOTE-02, VOTE-04).
 *   - highHP: true — bump vesting_shares on the seeded user's
 *     find_accounts entry so `net_vests > 1M` and `enable_slider`
 *     flips true (VOTE-05..09).
 */
const VARIANTS = [
  {
    name: 'postVoting_upvoted',
    priorVote: { votePercent: 10000, rshares: 1_000_000 }
  },
  {
    name: 'postVoting_downvoted',
    priorVote: { votePercent: -10000, rshares: -1_000_000 }
  },
  {
    name: 'postVoting_highHP',
    highHP: true
  },
  // Slider-based prior votes use non-100% vote_percent to signal the vote
  // came from the slider flow rather than a one-click default. 5000 = 50%.
  {
    name: 'postVoting_highHP_upvoted',
    highHP: true,
    priorVote: { votePercent: 5000, rshares: 500_000 }
  },
  {
    name: 'postVoting_highHP_downvoted',
    highHP: true,
    priorVote: { votePercent: -5000, rshares: -500_000 }
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, content) {
  // Trailing newline matches what the record path writes via JSON.stringify
  // + explicit "\n" in legacy code — keep diffs stable for reviewers.
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
}

function findFile(dir, matchSubstring) {
  const matches = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_') && f.includes(matchSubstring));
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one '${matchSubstring}' fixture in ${dir}, found ${matches.length}`
    );
  }
  return matches[0];
}

/**
 * Cut each post's active_votes to TRIMMED_VOTERS_PER_POST entries, pinning
 * VOTER first if they appear anywhere in the list. Mutates in place.
 * Idempotent — re-running on an already trimmed array is a no-op.
 */
function trimActiveVotes(post) {
  if (!Array.isArray(post.active_votes)) return;
  const seeded = post.active_votes.find((v) => v.voter === VOTER);
  const others = post.active_votes.filter((v) => v.voter !== VOTER);
  const head = others.slice(0, TRIMMED_VOTERS_PER_POST);
  post.active_votes = seeded ? [seeded, ...head] : head;
}

/**
 * Applies the active_votes trim to the committed base fixture so both the
 * base itself and every overlay variant inherit the smaller file. Idempotent.
 */
function trimBaseRankedPosts(baseDir) {
  const fileName = findFile(baseDir, 'bridge.get_ranked_posts');
  const filePath = path.join(baseDir, fileName);
  const content = readJson(filePath);
  const posts = content?.response?.result;
  if (!Array.isArray(posts)) {
    throw new Error(`Unexpected shape in ${fileName}: no response.result[]`);
  }
  const before = posts.reduce((sum, p) => sum + (p.active_votes?.length ?? 0), 0);
  posts.forEach(trimActiveVotes);
  const after = posts.reduce((sum, p) => sum + (p.active_votes?.length ?? 0), 0);
  writeJson(filePath, content);
  console.log(
    `✓ base/${fileName}: active_votes trimmed ${before} → ${after} entries (≤${TRIMMED_VOTERS_PER_POST}/post)`
  );
}

/**
 * Copy just a single fixture file from base → variant, then apply a patch
 * callback. The filename (and therefore its 4-digit index prefix) is
 * preserved so the overlay maps cleanly to the base entry by request hash.
 */
function overlayFile(baseDir, targetDir, matchSubstring, patch) {
  const fileName = findFile(baseDir, matchSubstring);
  const content = readJson(path.join(baseDir, fileName));
  patch(content, fileName);
  writeJson(path.join(targetDir, fileName), content);
}

function writeVariantIndex(targetDir, variant) {
  const index = {
    testName: variant.name,
    base: BASE_DIR,
    generatedAt: new Date().toISOString(),
    generator: 'generate-voted-variants.mjs',
    flags: {
      highHP: !!variant.highHP,
      priorVote: variant.priorVote ?? null
    }
  };
  writeJson(path.join(targetDir, '_index.json'), index);
}

function generateVariant(variant) {
  const baseDir = path.join(FIXTURES_ROOT, BASE_DIR);
  const targetDir = path.join(FIXTURES_ROOT, variant.name);

  // Overlay: start from empty variant dir; only patched files are written.
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  if (variant.highHP) {
    overlayFile(baseDir, targetDir, 'database_api.find_accounts', (content, fileName) => {
      const accounts = content.response?.result?.accounts;
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error(`Unexpected shape in ${fileName}: no accounts[]`);
      }
      const target = accounts.find((a) => a.name === VOTER) ?? accounts[0];
      if (!target?.vesting_shares?.amount) {
        throw new Error(
          `Unexpected shape in ${fileName}: no vesting_shares.amount for ${VOTER}`
        );
      }
      target.vesting_shares.amount = HIGH_HP_VESTING_AMOUNT;
    });
  }

  if (variant.priorVote) {
    overlayFile(baseDir, targetDir, 'bridge.get_ranked_posts', (content, fileName) => {
      const firstPost = content.response?.result?.[0];
      if (!firstPost?.active_votes) {
        throw new Error(`Unexpected shape in ${fileName}: no first-post active_votes`);
      }
      const already = firstPost.active_votes.find((v) => v.voter === VOTER);
      if (already) {
        already.rshares = variant.priorVote.rshares;
      } else {
        firstPost.active_votes.unshift({
          rshares: variant.priorVote.rshares,
          voter: VOTER
        });
      }
    });

    overlayFile(baseDir, targetDir, 'database_api.list_votes', (content, fileName) => {
      const author = content.params?.start?.[0];
      const permlink = content.params?.start?.[1];
      if (!author || !permlink) {
        throw new Error(`Unexpected shape in ${fileName}: no {author, permlink}`);
      }
      content.response = {
        id: 1,
        jsonrpc: '2.0',
        result: {
          votes: [
            {
              author,
              id: 1,
              last_update: '2026-04-22T10:00:00',
              num_changes: 0,
              permlink,
              rshares: variant.priorVote.rshares,
              vote_percent: variant.priorVote.votePercent,
              voter: VOTER,
              weight: Math.abs(variant.priorVote.rshares)
            }
          ]
        }
      };
    });
  }

  writeVariantIndex(targetDir, variant);

  const fileCount = fs.readdirSync(targetDir).length; // includes _index.json
  const priorVoteTag = variant.priorVote
    ? `vote_percent=${variant.priorVote.votePercent}`
    : '(no prior vote)';
  console.log(
    `✓ ${variant.name}: voter=${VOTER}, highHP=${!!variant.highHP}, ${priorVoteTag} — ${fileCount} files`
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

const baseDir = path.join(FIXTURES_ROOT, BASE_DIR);
if (!fs.existsSync(baseDir)) {
  console.error(
    `Base fixture dir not found: ${baseDir}\n` +
      `Record it first with: pnpm --filter @hive/blog test:fixture:record -- postVoting`
  );
  process.exit(1);
}

trimBaseRankedPosts(baseDir);
for (const variant of VARIANTS) {
  generateVariant(variant);
}
