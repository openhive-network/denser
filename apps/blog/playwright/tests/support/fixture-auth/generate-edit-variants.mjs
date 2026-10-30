#!/usr/bin/env node
/**
 * §3 Post Editing — fixture variant generator.
 *
 * Produces three overlay dirs derived from the `postEditOwn/` base, plus
 * a "neutralisation" pass that rewrites the base's recorded post into the
 * pre-edit state §3 specs need:
 *
 *   - `payout_at`            → 2030-12-31T00:00:00  (delete window open)
 *   - `max_accepted_payout`  → "1000000.000 HBD"   (no-limit)
 *   - `net_rshares`          → 0                    (allows Decline option)
 *   - `percent_hbd`          → 10000                (50/50)
 *   - `json_metadata.tags`   → ['test', 'foo', 'bar']
 *   - `children`             → 0                    (delete-button gate)
 *
 * The real on-chain post used as the recording source (`test-post-1772011775775`
 * by guest4test) is long-since-paid-out, has no tags, and a past payout window
 * — none of which exercise the §3 EDIT flows. Patching in place gives us a
 * deterministic neutral baseline without re-recording. After any re-record of
 * postEditOwn/ via `pnpm test:fixture:record -- postEdit.spec.ts`, re-run this
 * generator to re-apply the neutralisation AND regenerate variants.
 *
 * Variants (each one targeted at a single EDIT sub-case):
 *
 *   - postEditOwn_voted      → net_rshares > 0  (EDIT-03b: Decline hidden)
 *   - postEditOwn_finalized  → max_accepted_payout = "0.000 HBD"
 *                              (EDIT-03c: "Reward options are final")
 *   - postEditOwn_community  → community / community_title / category set
 *                              (EDIT-04: comment_operation.parent_permlink
 *                              becomes the community id), plus the editor's
 *                              bridge.get_community read of that community,
 *                              which the base never makes
 *
 * Usage:
 *   1) Record the base (once, or after deliberate re-record):
 *        FIXTURE_UPSTREAM=api.hive.blog FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postEdit.spec.ts
 *   2) Neutralise base + regenerate variants:
 *        node playwright/tests/support/fixture-auth/generate-edit-variants.mjs
 *   3) Replay all §3 specs offline:
 *        pnpm --filter @hive/blog test:fixture -- postEdit
 */

import crypto from 'node:crypto';
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

const BASE_NAME = 'postEditOwn';
const POST_AUTHOR = process.env.CI_TEST_USER || 'guest4test';
const POST_PERMLINK = 'test-post-1772011775775';

const NEUTRAL = {
  payout_at: '2030-12-31T00:00:00',
  max_accepted_payout: '1000000.000 HBD',
  net_rshares: 0,
  percent_hbd: 10000,
  tags: ['test', 'foo', 'bar'],
  children: 0,
  is_paidout: false,
  pending_payout_value: '0.000 HBD',
  author_payout_value: '0.000 HBD',
  curator_payout_value: '0.000 HBD'
};

const COMMUNITY = 'hive-137823';
const COMMUNITY_TITLE = 'Test Hive 137823';

/**
 * hive-137823 as api.hive.blog answered bridge.get_community for guest4test,
 * with the title set to COMMUNITY_TITLE.
 */
const COMMUNITY_RESULT = {
  id: 1367505,
  lang: 'en',
  name: COMMUNITY,
  team: [
    [COMMUNITY, 'owner', ''],
    ['juliakponsford', 'admin', ''],
    ['whatsup', 'mod', ''],
    ['steemitqa', 'mod', '']
  ],
  about: '',
  title: COMMUNITY_TITLE,
  context: { role: 'guest', title: '', subscribed: true },
  is_nsfw: false,
  type_id: 1,
  settings: {},
  flag_text: '',
  created_at: '2020-02-20 19:49:48',
  description: '',
  num_authors: 0,
  num_pending: 0,
  subscribers: 8,
  sum_pending: 0
};

function readJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function writeJSON(filepath, content) {
  fs.writeFileSync(filepath, JSON.stringify(content, null, 2) + '\n');
}

function findFiles(dir, matchSubstring) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f.includes(matchSubstring));
}

/**
 * Apply NEUTRAL field values to whatever entry in `content` represents our
 * post. Three shapes show up across the recorded RPCs:
 *
 *   1) bridge.get_post           → result is the post object itself
 *   2) bridge.get_discussion     → result is a map keyed by author/permlink;
 *                                  result[`${author}/${permlink}`] is the
 *                                  post (depth=0), plus replies
 *   3) database_api.list_votes   → no post fields, only votes — skipped
 *
 * The body / title / category fields are not touched here so they reflect
 * whatever the recording captured (or whatever a follow-up overlay sets).
 */
function patchPostEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  entry.payout_at = NEUTRAL.payout_at;
  entry.max_accepted_payout = NEUTRAL.max_accepted_payout;
  entry.net_rshares = NEUTRAL.net_rshares;
  entry.percent_hbd = NEUTRAL.percent_hbd;
  entry.children = NEUTRAL.children;
  entry.is_paidout = NEUTRAL.is_paidout;
  entry.pending_payout_value = NEUTRAL.pending_payout_value;
  entry.author_payout_value = NEUTRAL.author_payout_value;
  entry.curator_payout_value = NEUTRAL.curator_payout_value;
  entry.active_votes = [];
  // json_metadata in the wire format is sometimes a string (Hive node
  // returns it pre-stringified), sometimes already parsed (Hivemind).
  // Both shapes appear in recordings depending on which API we hit.
  const md = entry.json_metadata;
  if (typeof md === 'string') {
    try {
      const parsed = JSON.parse(md);
      parsed.tags = NEUTRAL.tags;
      entry.json_metadata = JSON.stringify(parsed);
    } catch {
      entry.json_metadata = JSON.stringify({ tags: NEUTRAL.tags });
    }
  } else if (md && typeof md === 'object') {
    md.tags = NEUTRAL.tags;
  } else {
    entry.json_metadata = { tags: NEUTRAL.tags };
  }
  return true;
}

function eachPostEntry(content, cb) {
  const result = content.response?.result;
  if (!result) return 0;
  let patched = 0;

  // bridge.get_post → result *is* the entry
  if (
    typeof result === 'object' &&
    !Array.isArray(result) &&
    result.author === POST_AUTHOR &&
    result.permlink === POST_PERMLINK
  ) {
    if (cb(result)) patched++;
    return patched;
  }

  // bridge.get_discussion → keyed map
  if (typeof result === 'object' && !Array.isArray(result)) {
    const key = `${POST_AUTHOR}/${POST_PERMLINK}`;
    if (result[key]) {
      if (cb(result[key])) patched++;
    }
  }

  return patched;
}

function neutraliseBase() {
  const baseDir = path.join(FIXTURES_ROOT, BASE_NAME);
  if (!fs.existsSync(baseDir)) {
    console.warn(
      `↷ ${BASE_NAME}: base dir missing — record it first with: ` +
        `pnpm --filter @hive/blog test:fixture:record -- postEdit.spec.ts`
    );
    return false;
  }

  const targets = [
    ...findFiles(baseDir, 'bridge.get_post'),
    ...findFiles(baseDir, 'bridge.get_discussion')
  ];
  if (targets.length === 0) {
    console.warn(
      `↷ ${BASE_NAME}: no bridge.get_post / bridge.get_discussion fixtures ` +
        `to neutralise. Did the recording actually load /@${POST_AUTHOR}/${POST_PERMLINK}?`
    );
    return false;
  }

  let totalPatched = 0;
  for (const f of targets) {
    const filepath = path.join(baseDir, f);
    const content = readJSON(filepath);
    const patched = eachPostEntry(content, patchPostEntry);
    if (patched > 0) {
      writeJSON(filepath, content);
      totalPatched += patched;
    }
  }

  if (totalPatched === 0) {
    console.warn(
      `↷ ${BASE_NAME}: target post (${POST_AUTHOR}/${POST_PERMLINK}) not ` +
        `found in any recorded response. Check OWN_POST_PERMLINK in ` +
        `postEditingContext.ts matches the recording.`
    );
    return false;
  }

  console.log(
    `✓ ${BASE_NAME}: neutralised ${totalPatched} post entr${totalPatched === 1 ? 'y' : 'ies'} ` +
      `across ${targets.length} files`
  );
  return true;
}

function patchVoted(entry) {
  entry.net_rshares = 1_000_000_000;
  return true;
}

function patchFinalized(entry) {
  entry.max_accepted_payout = '0.000 HBD';
  return true;
}

function patchCommunity(entry) {
  entry.community = COMMUNITY;
  entry.community_title = COMMUNITY_TITLE;
  entry.category = COMMUNITY;
  return true;
}

/** A JSON-RPC fixture entry; `requestHash` follows fixture-proxy.ts's computeRequestHash. */
function jsonRpcFixture(method, params, result) {
  const hashedBody = { jsonrpc: '2.0', method, params };
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ m: 'POST', p: '/', q: {}, b: hashedBody }))
    .digest('hex')
    .slice(0, 16);
  return {
    httpMethod: 'POST',
    requestPath: '/',
    requestBody: { ...hashedBody, id: 1 },
    requestHash,
    method,
    params,
    response: { jsonrpc: '2.0', result, id: 1 },
    responseStatus: 200,
    responseContentType: 'application/json'
  };
}

// The post editor reads the community it posts into, which for an edit is the post's category
const EDITOR_COMMUNITY_FIXTURE = {
  file: '0013-bridge.get_community.json',
  content: jsonRpcFixture('bridge.get_community', { name: COMMUNITY, observer: POST_AUTHOR }, COMMUNITY_RESULT)
};

const VARIANTS = [
  { name: `${BASE_NAME}_voted`, patcher: patchVoted },
  { name: `${BASE_NAME}_finalized`, patcher: patchFinalized },
  { name: `${BASE_NAME}_community`, patcher: patchCommunity, added: [EDITOR_COMMUNITY_FIXTURE] }
];

function generateVariant(variant) {
  const baseDir = path.join(FIXTURES_ROOT, BASE_NAME);
  const targetDir = path.join(FIXTURES_ROOT, variant.name);

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const overlayFiles = [];
  const sources = [
    ...findFiles(baseDir, 'bridge.get_post'),
    ...findFiles(baseDir, 'bridge.get_discussion')
  ];

  for (const f of sources) {
    const content = readJSON(path.join(baseDir, f));
    let touched = 0;
    eachPostEntry(content, (entry) => {
      const ok = variant.patcher(entry);
      if (ok) touched++;
      return ok;
    });
    if (touched > 0) {
      writeJSON(path.join(targetDir, f), content);
      overlayFiles.push(f);
    }
  }

  const added = variant.added ?? [];
  for (const { file, content } of added) {
    writeJSON(path.join(targetDir, file), content);
    overlayFiles.push(file);
  }

  writeJSON(path.join(targetDir, '_index.json'), {
    testName: variant.name,
    base: BASE_NAME,
    generatedAt: new Date().toISOString(),
    overlayFiles,
    // Keys new to the base, not patches of its recordings
    ...(added.length > 0 && { additive: true })
  });

  console.log(
    `✓ ${variant.name}: overlay=[${overlayFiles.join(', ')}]`
  );
}

if (neutraliseBase()) {
  for (const v of VARIANTS) generateVariant(v);
}
