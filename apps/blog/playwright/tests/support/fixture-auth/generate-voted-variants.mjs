#!/usr/bin/env node
/**
 * Generates fixture dirs for "user has already upvoted / downvoted" test
 * preconditions by patching a freshly-recorded `postVoting/` base dir.
 *
 * Why this exists: SSR-rendered Next.js pages fetch chain data inside the
 * server process, so Playwright's `page.route` cannot intercept/override
 * those responses. The cleanest way to seed "user already voted" state is
 * therefore to prepare a separate fixture dir with pre-patched responses
 * and switch `fixtureTestName` per `test.describe`.
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
 * Only two fixture files are patched:
 *   - bridge.get_ranked_posts: inject guest4test as a voter on the first
 *     post (needed for the component's `checkVote` to be truthy, which
 *     enables the `list_votes` query on initial render).
 *   - database_api.list_votes: return a single vote by guest4test with the
 *     appropriate vote_percent (±10000), so the component flips into its
 *     "already voted" branch and renders VoteRemovalDialog.
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

const VARIANTS = [
  {
    name: 'postVoting_upvoted',
    votePercent: 10000,
    rshares: 1_000_000
  },
  {
    name: 'postVoting_downvoted',
    votePercent: -10000,
    rshares: -1_000_000
  }
];

function patchFixtureFile(filePath, transform) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  transform(content);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
}

function findFiles(dir, matchSubstring) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f.includes(matchSubstring));
}

for (const variant of VARIANTS) {
  const baseDir = path.join(FIXTURES_ROOT, BASE_DIR);
  const targetDir = path.join(FIXTURES_ROOT, variant.name);

  if (!fs.existsSync(baseDir)) {
    console.error(
      `Base fixture dir not found: ${baseDir}\n` +
        `Record it first with: pnpm --filter @hive/blog test:fixture:record -- postVoting`
    );
    process.exit(1);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(baseDir, targetDir, { recursive: true });

  // Patch get_ranked_posts: add voter to first post's active_votes.
  const postsFiles = findFiles(targetDir, 'bridge.get_ranked_posts');
  if (postsFiles.length === 0) {
    throw new Error(
      `No bridge.get_ranked_posts fixture found in ${targetDir}`
    );
  }
  for (const f of postsFiles) {
    patchFixtureFile(path.join(targetDir, f), (content) => {
      const firstPost = content.response?.result?.[0];
      if (!firstPost?.active_votes) {
        throw new Error(`Unexpected shape in ${f}: no first-post active_votes`);
      }
      const already = firstPost.active_votes.find((v) => v.voter === VOTER);
      if (!already) {
        firstPost.active_votes.unshift({
          rshares: variant.rshares,
          voter: VOTER
        });
      } else {
        already.rshares = variant.rshares;
      }
    });
  }

  // Patch list_votes: return a single pre-existing vote by our voter.
  const listVotesFiles = findFiles(targetDir, 'database_api.list_votes');
  if (listVotesFiles.length === 0) {
    throw new Error(
      `No database_api.list_votes fixture found in ${targetDir}`
    );
  }
  for (const f of listVotesFiles) {
    patchFixtureFile(path.join(targetDir, f), (content) => {
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
              rshares: variant.rshares,
              vote_percent: variant.votePercent,
              voter: VOTER,
              weight: Math.abs(variant.rshares)
            }
          ]
        }
      };
    });
  }

  console.log(
    `✓ ${variant.name}: voter=${VOTER}, vote_percent=${variant.votePercent}`
  );
}
