#!/usr/bin/env node
/**
 * Generates the `postCreate_userWithPosts` overlay fixture from the
 * recorded `postCreate` base. Patches every recorded
 * `bridge.get_account_posts` call whose `params.account` is the seeded
 * user so its `result` becomes a non-empty list of synthetic posts.
 *
 * This seeds the §2.1 POST-02 precondition ("user already has posts")
 * without re-recording the entire submit-page traffic. The same overlay
 * approach is used by generate-voted-variants.mjs — see that file for
 * the broader rationale (SSR can't be intercepted by page.route).
 *
 * Usage:
 *   1) Record the base:
 *        FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreate.spec
 *   2) Generate the overlay:
 *        node playwright/tests/support/fixture-auth/generate-user-with-posts-variant.mjs
 *   3) Replay POST-02:
 *        pnpm --filter @hive/blog test:fixture -- postCreateUserWithPosts.spec
 *
 * If the base recording does not contain a bridge.get_account_posts call
 * for the seeded user, the script writes only an `_index.json` (no
 * patched payloads) — the overlay still resolves to the base's data on
 * replay, which is the right no-op behaviour for forward-compatibility.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', 'mock', 'fixtures');

const VOTER = process.env.CI_TEST_USER || 'guest4test';
const BASE_NAME = 'postCreate';
const VARIANT_NAME = 'postCreate_userWithPosts';

/**
 * Build a single synthetic post entry for a user's blog feed. Schema
 * mirrors what bridge.get_account_posts returns at the property level
 * the welcome-mat / "has posts" UI checks read — a non-empty array is
 * what flips the gate; deeper field validation isn't part of the
 * editor flow under test.
 */
function buildSyntheticPost(index) {
  const created = new Date(Date.UTC(2026, 0, index + 1)).toISOString().replace(/\.\d+Z$/, '');
  return {
    post_id: 900_000_000 + index,
    author: VOTER,
    permlink: `synthetic-post-${index}`,
    category: 'test',
    parent_author: '',
    parent_permlink: 'test',
    title: `Synthetic post ${index}`,
    body: 'Synthetic body for §2.1 POST-02 fixture overlay.',
    json_metadata: JSON.stringify({
      tags: ['test'],
      app: 'fixture-overlay'
    }),
    created,
    updated: created,
    last_update: created,
    depth: 0,
    children: 0,
    net_rshares: 0,
    is_paidout: false,
    payout_at: '2099-01-01T00:00:00',
    payout: 0,
    pending_payout_value: '0.000 HBD',
    author_payout_value: '0.000 HBD',
    curator_payout_value: '0.000 HBD',
    promoted: '0.000 HBD',
    replies: [],
    body_length: 50,
    active_votes: [],
    author_reputation: 25,
    stats: { hide: false, gray: false, total_votes: 0, flag_weight: 0 },
    url: `/test/@${VOTER}/synthetic-post-${index}`,
    beneficiaries: [],
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 10000,
    blacklists: []
  };
}

const SYNTHETIC_POSTS = [buildSyntheticPost(1), buildSyntheticPost(2)];

function readBaseFixture(filename) {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES_ROOT, BASE_NAME, filename), 'utf8')
  );
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

function run() {
  const baseDir = path.join(FIXTURES_ROOT, BASE_NAME);
  if (!fs.existsSync(baseDir)) {
    console.warn(
      `↷ ${BASE_NAME}: base dir missing — record first with: ` +
        `pnpm --filter @hive/blog test:fixture:record -- ${BASE_NAME}.spec`
    );
    return;
  }

  const targetDir = path.join(FIXTURES_ROOT, VARIANT_NAME);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const overlayFiles = [];

  // Match every bridge.get_account_posts call for the seeded user.
  // Different sorts ('blog', 'posts', 'feed') may be recorded depending on
  // which surfaces the test traffic exercises — patching all of them is
  // safe because we only care about non-emptiness.
  const candidateFiles = findFiles(baseDir, 'bridge.get_account_posts');
  for (const f of candidateFiles) {
    const content = readBaseFixture(f);
    const account = content.params?.account;
    if (account !== VOTER) continue;
    if (!content.response?.result) {
      console.warn(`↷ ${f}: response.result missing — leaving untouched`);
      continue;
    }
    content.response.result = SYNTHETIC_POSTS;
    writeFixture(targetDir, f, content);
    overlayFiles.push(f);
  }

  writeFixture(targetDir, '_index.json', {
    testName: VARIANT_NAME,
    base: BASE_NAME,
    generatedAt: new Date().toISOString(),
    overlayFiles
  });

  if (overlayFiles.length === 0) {
    console.warn(
      `↷ ${VARIANT_NAME}: no bridge.get_account_posts call found for ` +
        `${VOTER} in ${BASE_NAME}/. The overlay will resolve to the base's ` +
        `data on replay (no-op). If POST-02 starts to depend on this state, ` +
        `re-record the base after triggering an account-posts fetch.`
    );
  } else {
    console.log(
      `✓ ${VARIANT_NAME}: voter=${VOTER}, overlay=[${overlayFiles.join(', ')}]`
    );
  }
}

run();
