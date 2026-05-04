#!/usr/bin/env node
/**
 * Generates overlay fixture dirs for "user has already upvoted / downvoted"
 * test preconditions. Patches a small set of files from a recorded base
 * (e.g. `postVoting/` or `commentVoting/`) and writes only those files —
 * plus an `_index.json` declaring the base — into a sibling variant dir.
 *
 * Why this exists: SSR-rendered Next.js pages fetch chain data inside the
 * server process, so Playwright's `page.route` cannot intercept/override
 * those responses. The cleanest way to seed "user already voted" state is
 * therefore to prepare a separate fixture dir with pre-patched responses
 * and switch `fixtureTestName` per `test.describe`.
 *
 * Overlay approach: variant dirs contain only the files that differ from
 * the base, plus an `_index.json` with a `base` field. At replay time,
 * `fixture-proxy.ts` loads the base dir first, then overlays the variant's
 * files on top — matching method+params keys are replaced.
 *
 * Usage:
 *   1) Record each base scenario you want variants for, e.g.:
 *        FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postVoting
 *        FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- commentVoting
 *   2) Regenerate the pre-voted variants from those bases:
 *        node playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 *   3) Replay all voting tests:
 *        pnpm --filter @hive/blog test:fixture -- Voting
 *
 * Scenarios whose base dir hasn't been recorded yet are skipped with a
 * warning rather than aborting — so adding a new scenario doesn't block
 * regeneration of the others.
 *
 * Patched files per variant:
 *   - highHP (post scenarios only): database_api.find_accounts
 *     (vesting_shares inflated)
 *   - priorVote on a post: bridge.get_ranked_posts (voter added to
 *     result[0].active_votes) + database_api.list_votes
 *   - priorVote on a comment: bridge.get_discussion (voter added to
 *     result[`${author}/${permlink}`].active_votes) +
 *     database_api.list_votes (only the limit:1 lookup for that
 *     specific comment)
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

const VOTER = process.env.CI_TEST_USER || 'guest4test';

// 50M VESTS — comfortably above VOTE_WEIGHT_DROPDOWN_THRESHOLD (1M) and
// well within realistic mainnet whale magnitudes, so the UI's derived
// displays (manabar, reputation etc.) don't look absurd.
const HIGH_HP_VESTING_AMOUNT = '50000000000000';

/**
 * Pinned identity of the comment that `commentVoting.spec.ts` exercises
 * via `.first()`. After re-recording `commentVoting/`, look at the
 * first-rendered comment in the trace (or in
 * 0003-bridge.get_discussion.json — whichever entry is first by sort
 * order in the UI) and update these two constants.
 *
 * Keeping the constants in this file (rather than in
 * commentVotingContext.ts) avoids ESM ↔ Node import friction; the spec
 * itself doesn't need them — it reads the values from the DOM.
 */
const COMMENT_TARGET_AUTHOR = 'sicarius';
const COMMENT_TARGET_PERMLINK = 're-gtg-qux0er';

/**
 * Each scenario describes one base dir + the variants derived from it.
 *   target.kind === 'post'    → patch result[0] of bridge.get_ranked_posts
 *   target.kind === 'comment' → patch result[<author>/<permlink>] of
 *                               bridge.get_discussion
 */
const SCENARIOS = [
  {
    baseName: 'postVoting',
    target: { kind: 'post' },
    variants: [
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
      // Slider-based prior votes use non-100% vote_percent to signal the
      // vote came from the slider flow rather than a one-click default.
      // 5000 = 50%.
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
    ]
  },
  {
    baseName: 'commentVoting',
    target: {
      kind: 'comment',
      author: COMMENT_TARGET_AUTHOR,
      permlink: COMMENT_TARGET_PERMLINK
    },
    variants: [
      {
        name: 'commentVoting_upvoted',
        priorVote: { votePercent: 10000, rshares: 1_000_000 }
      },
      {
        name: 'commentVoting_downvoted',
        priorVote: { votePercent: -10000, rshares: -1_000_000 }
      }
    ]
  }
];

function readBaseFixture(baseDir, filename) {
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

/**
 * Patch active_votes on the target post or comment so `checkVote` is
 * truthy and the UI fetches list_votes on initial render.
 */
function patchActiveVotes(content, target, variant, file) {
  if (target.kind === 'post') {
    const firstPost = content.response?.result?.[0];
    if (!firstPost?.active_votes) {
      throw new Error(`Unexpected shape in ${file}: no first-post active_votes`);
    }
    upsertVoter(firstPost.active_votes, variant.priorVote.rshares);
    return;
  }

  if (target.kind === 'comment') {
    const key = `${target.author}/${target.permlink}`;
    const entry = content.response?.result?.[key];
    if (!entry?.active_votes) {
      throw new Error(
        `Unexpected shape in ${file}: no active_votes under "${key}". ` +
          `Did the comment author/permlink change in the recording? ` +
          `Update COMMENT_TARGET_* constants in this generator.`
      );
    }
    upsertVoter(entry.active_votes, variant.priorVote.rshares);
    return;
  }

  throw new Error(`Unknown target.kind: ${target.kind}`);
}

function upsertVoter(activeVotes, rshares) {
  const already = activeVotes.find((v) => v.voter === VOTER);
  if (already) {
    already.rshares = rshares;
  } else {
    activeVotes.unshift({ rshares, voter: VOTER });
  }
}

/**
 * Build a list_votes response with a single pre-existing vote by VOTER.
 * Shared between post and comment variants — same result shape.
 */
function buildListVotesResponse(author, permlink, priorVote) {
  return {
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
          rshares: priorVote.rshares,
          vote_percent: priorVote.votePercent,
          voter: VOTER,
          weight: Math.abs(priorVote.rshares)
        }
      ]
    }
  };
}

/**
 * Decide whether a list_votes file applies to the variant target. For
 * post targets we patch any list_votes (the trending feed only fetches
 * votes for the first post anyway). For comment targets we restrict to
 * the votes-component's own limit:1 query against the target comment,
 * so the post-detail page's wider list_votes calls (limit:1000 for the
 * post itself) stay untouched.
 */
function listVotesAppliesToTarget(content, target) {
  if (target.kind === 'post') return true;
  if (target.kind === 'comment') {
    const start = content.params?.start;
    return (
      Array.isArray(start) &&
      start[0] === target.author &&
      start[1] === target.permlink &&
      content.params?.limit === 1
    );
  }
  return false;
}

function runScenario(scenario) {
  const baseDir = path.join(FIXTURES_ROOT, scenario.baseName);
  if (!fs.existsSync(baseDir)) {
    console.warn(
      `↷ ${scenario.baseName}: base dir missing — skipping its variants. ` +
        `Record with: pnpm --filter @hive/blog test:fixture:record -- ${scenario.baseName}`
    );
    return;
  }

  if (
    scenario.target.kind === 'comment' &&
    (scenario.target.author.startsWith('TBD') ||
      scenario.target.permlink.startsWith('TBD'))
  ) {
    console.warn(
      `↷ ${scenario.baseName}: COMMENT_TARGET_AUTHOR/PERMLINK still set to ` +
        `"TBD" — pin them in this generator before regenerating ` +
        `${scenario.baseName} variants.`
    );
    return;
  }

  // The bridge call that carries active_votes for our target.
  const bridgeFileMatch =
    scenario.target.kind === 'comment'
      ? 'bridge.get_discussion'
      : 'bridge.get_ranked_posts';

  for (const variant of scenario.variants) {
    const targetDir = path.join(FIXTURES_ROOT, variant.name);
    const overlayFiles = [];

    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });

    // highHP only applies to post scenarios — boosts the seeded user's
    // vesting_shares so net_vests > 1M and `enable_slider` flips true.
    if (variant.highHP) {
      const accountFiles = findFiles(baseDir, 'database_api.find_accounts');
      if (accountFiles.length === 0) {
        throw new Error(
          `No database_api.find_accounts fixture found in ${baseDir}`
        );
      }
      for (const f of accountFiles) {
        const content = readBaseFixture(baseDir, f);
        const accounts = content.response?.result?.accounts;
        if (!Array.isArray(accounts) || accounts.length === 0) {
          throw new Error(`Unexpected shape in ${f}: no accounts[]`);
        }
        const acct =
          accounts.find((a) => a.name === VOTER) ?? accounts[0];
        if (!acct?.vesting_shares?.amount) {
          throw new Error(
            `Unexpected shape in ${f}: no vesting_shares.amount for ${VOTER}`
          );
        }
        acct.vesting_shares.amount = HIGH_HP_VESTING_AMOUNT;
        writeFixture(targetDir, f, content);
        overlayFiles.push(f);
      }
    }

    if (variant.priorVote) {
      // Patch active_votes on the target (post or comment).
      const bridgeFiles = findFiles(baseDir, bridgeFileMatch);
      if (bridgeFiles.length === 0) {
        throw new Error(
          `No ${bridgeFileMatch} fixture found in ${baseDir}`
        );
      }
      for (const f of bridgeFiles) {
        const content = readBaseFixture(baseDir, f);
        patchActiveVotes(content, scenario.target, variant, f);
        writeFixture(targetDir, f, content);
        overlayFiles.push(f);
      }

      // Patch list_votes responses that apply to the target. For comment
      // targets this filters out unrelated post-detail list_votes calls.
      const listVotesFiles = findFiles(baseDir, 'database_api.list_votes');
      if (listVotesFiles.length === 0) {
        throw new Error(
          `No database_api.list_votes fixture found in ${baseDir}`
        );
      }
      let patchedAny = false;
      for (const f of listVotesFiles) {
        const content = readBaseFixture(baseDir, f);
        if (!listVotesAppliesToTarget(content, scenario.target)) continue;
        const author = content.params?.start?.[0];
        const permlink = content.params?.start?.[1];
        if (!author || !permlink) {
          throw new Error(`Unexpected shape in ${f}: no {author, permlink}`);
        }
        content.response = buildListVotesResponse(
          author,
          permlink,
          variant.priorVote
        );
        writeFixture(targetDir, f, content);
        overlayFiles.push(f);
        patchedAny = true;
      }
      if (!patchedAny) {
        throw new Error(
          `No matching list_votes file in ${baseDir} for target ` +
            `${JSON.stringify(scenario.target)}. Did the recording capture ` +
            `the votes-component's limit:1 lookup?`
        );
      }
    }

    writeFixture(targetDir, '_index.json', {
      testName: variant.name,
      base: scenario.baseName,
      generatedAt: new Date().toISOString(),
      overlayFiles
    });

    const priorVoteTag = variant.priorVote
      ? `vote_percent=${variant.priorVote.votePercent}`
      : '(no prior vote)';
    console.log(
      `✓ ${variant.name}: voter=${VOTER}, highHP=${!!variant.highHP}, ` +
        `${priorVoteTag}, overlay=[${overlayFiles.join(', ')}]`
    );
  }
}

for (const scenario of SCENARIOS) {
  runScenario(scenario);
}
