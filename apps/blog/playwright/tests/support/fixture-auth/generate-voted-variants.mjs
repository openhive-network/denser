#!/usr/bin/env node
/**
 * Generates overlay fixture dirs for "user has already upvoted / downvoted"
 * test preconditions by patching specific files from the `postVoting/` base.
 *
 * Why this exists: SSR-rendered Next.js pages fetch chain data inside the
 * server process, so Playwright's `page.route` cannot intercept/override
 * those responses. The cleanest way to seed "user already voted" state is
 * therefore to prepare a separate fixture dir with pre-patched responses
 * and switch `fixtureTestName` per `test.describe`.
 *
 * Overlay approach: variant dirs contain only the files that differ from the
 * base, plus an `_index.json` with a `base` field. At replay time,
 * `fixture-proxy.ts` loads the base dir first, then overlays the variant's
 * files on top — matching method+params keys are replaced.
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
 * Patched files per variant:
 *   - highHP: database_api.find_accounts (vesting_shares inflated)
 *   - priorVote: bridge.get_ranked_posts (guest4test added to active_votes)
 *                + database_api.list_votes (vote record for guest4test)
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

// 50M VESTS — comfortably above VOTE_WEIGHT_DROPDOWN_THRESHOLD (1M) and
// well within realistic mainnet whale magnitudes, so the UI's derived
// displays (manabar, reputation etc.) don't look absurd.
const HIGH_HP_VESTING_AMOUNT = '50000000000000';

function readBaseFixture(filename) {
  const baseDir = path.join(FIXTURES_ROOT, BASE_DIR);
  return JSON.parse(fs.readFileSync(path.join(baseDir, filename), 'utf8'));
}

function writeFixture(targetDir, filename, content) {
  fs.writeFileSync(
    path.join(targetDir, filename),
    JSON.stringify(content, null, 2) + '\n'
  );
}

function findFiles(dir, matchSubstring) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f.includes(matchSubstring));
}

const baseDir = path.join(FIXTURES_ROOT, BASE_DIR);
if (!fs.existsSync(baseDir)) {
  console.error(
    `Base fixture dir not found: ${baseDir}\n` +
      `Record it first with: pnpm --filter @hive/blog test:fixture:record -- postVoting`
  );
  process.exit(1);
}

for (const variant of VARIANTS) {
  const targetDir = path.join(FIXTURES_ROOT, variant.name);
  const overlayFiles = [];

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  // highHP: inflate vesting_shares on the seeded user's find_accounts entry.
  if (variant.highHP) {
    const accountFiles = findFiles(baseDir, 'database_api.find_accounts');
    if (accountFiles.length === 0) {
      throw new Error(
        `No database_api.find_accounts fixture found in ${baseDir}`
      );
    }
    for (const f of accountFiles) {
      const content = readBaseFixture(f);
      const accounts = content.response?.result?.accounts;
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error(`Unexpected shape in ${f}: no accounts[]`);
      }
      const target = accounts.find((a) => a.name === VOTER) ?? accounts[0];
      if (!target?.vesting_shares?.amount) {
        throw new Error(
          `Unexpected shape in ${f}: no vesting_shares.amount for ${VOTER}`
        );
      }
      target.vesting_shares.amount = HIGH_HP_VESTING_AMOUNT;
      writeFixture(targetDir, f, content);
      overlayFiles.push(f);
    }
  }

  if (variant.priorVote) {
    // Patch get_ranked_posts: add voter to first post's active_votes.
    const postsFiles = findFiles(baseDir, 'bridge.get_ranked_posts');
    if (postsFiles.length === 0) {
      throw new Error(
        `No bridge.get_ranked_posts fixture found in ${baseDir}`
      );
    }
    for (const f of postsFiles) {
      const content = readBaseFixture(f);
      const firstPost = content.response?.result?.[0];
      if (!firstPost?.active_votes) {
        throw new Error(`Unexpected shape in ${f}: no first-post active_votes`);
      }
      const already = firstPost.active_votes.find((v) => v.voter === VOTER);
      if (!already) {
        firstPost.active_votes.unshift({
          rshares: variant.priorVote.rshares,
          voter: VOTER
        });
      } else {
        already.rshares = variant.priorVote.rshares;
      }
      writeFixture(targetDir, f, content);
      overlayFiles.push(f);
    }

    // Patch list_votes: return a single pre-existing vote by our voter.
    const listVotesFiles = findFiles(baseDir, 'database_api.list_votes');
    if (listVotesFiles.length === 0) {
      throw new Error(
        `No database_api.list_votes fixture found in ${baseDir}`
      );
    }
    for (const f of listVotesFiles) {
      const content = readBaseFixture(f);
      const author = content.params?.start?.[0];
      const permlink = content.params?.start?.[1];
      if (!author || !permlink) {
        throw new Error(`Unexpected shape in ${f}: no {author, permlink}`);
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
      writeFixture(targetDir, f, content);
      overlayFiles.push(f);
    }
  }

  // Write _index.json declaring this as an overlay of the base.
  writeFixture(targetDir, '_index.json', {
    testName: variant.name,
    base: BASE_DIR,
    generatedAt: new Date().toISOString(),
    overlayFiles
  });

  const priorVoteTag = variant.priorVote
    ? `vote_percent=${variant.priorVote.votePercent}`
    : '(no prior vote)';
  console.log(
    `✓ ${variant.name}: voter=${VOTER}, highHP=${!!variant.highHP}, ${priorVoteTag}, overlay=[${overlayFiles.join(', ')}]`
  );
}
