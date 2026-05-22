#!/usr/bin/env node
/**
 * Generates overlay fixture dirs for §9 Follow / Mute / Blacklist
 * pre-state — "user is already following X", "user has muted X",
 * "owner's blacklist already contains [a, b, c]", etc.
 *
 * Mirrors the pattern in generate-voted-variants.mjs: walks each base
 * dir, patches the smallest set of read-only RPC responses that flip
 * the relevant pre-state, and writes only the patched files (+
 * `_index.json` with `base:`) into a sibling variant dir.
 *
 * Usage:
 *   1) Record the base scenarios:
 *        FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- socialFollow
 *        ...etc for each base.
 *   2) Regenerate the social variants from those bases:
 *        node playwright/tests/support/fixture-auth/generate-social-variants.mjs
 *   3) Replay all §9 tests:
 *        pnpm --filter @hive/blog test:fixture -- social
 *
 * Scenarios whose base dir hasn't been recorded yet are skipped with a
 * warning rather than aborting.
 *
 * Patch operations (per-variant flags):
 *   - addFollowing:       inject `{follower, following, what}` row into
 *                         `condenser_api.get_following` / `bridge.get_following`
 *                         responses whose params.type matches.
 *   - profileContext:     set `context.followed`/`context.muted` on the
 *                         `bridge.get_profile` response for the target.
 *   - populateFollowList: replace the `result` of `bridge.get_follow_list`
 *                         responses whose params.follow_type matches with
 *                         a fresh list of entries (BLACKLIST_TARGETS).
 *
 * Observed RPC shapes (from recorded fixtures):
 *   condenser_api.get_following
 *     params:   POSITIONAL [account, start, type, limit]
 *     result:   [{ follower, following, what: string[] }, ...]
 *   bridge.get_profile
 *     params:   { account }
 *     result:   { context: { followed: bool, muted: bool, ... }, ... }
 *     (NB: the page records two get_profile calls — actor + target.
 *      `account` filter targets only the right one.)
 *   bridge.get_follow_list
 *     params:   { observer, follow_type: 'blacklisted'|'muted'|'follow_blacklist'|'follow_muted' }
 *     result:   [{ name, blacklist_description, muted_list_description }, ...]
 *
 * If a base recording produces a different shape (e.g. the bridge.get_following
 * substring no longer matches because the API was renamed), the per-op
 * "no fixtures matched" error fires loudly so we can adapt.
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

const FOLLOWER = process.env.CI_TEST_USER || 'guest4test';
const FOLLOW_TARGET_USER = 'hiveio';
const BLACKLIST_TARGETS = ['hiveio', 'ned', 'dan'];

/**
 * Each variant declares its base dir, its name, and a set of patch
 * operations keyed by op kind. The order of keys is irrelevant — each
 * op is applied independently as we walk the base files.
 */
const VARIANTS = [
  {
    name: 'socialFollow_followed',
    base: 'socialFollow',
    addFollowing: { type: 'blog', target: FOLLOW_TARGET_USER },
    profileContext: { account: FOLLOW_TARGET_USER, followed: true }
  },
  {
    name: 'socialMute_muted',
    base: 'socialMute',
    addFollowing: { type: 'ignore', target: FOLLOW_TARGET_USER },
    profileContext: { account: FOLLOW_TARGET_USER, muted: true }
  },
  {
    name: 'socialMutedListPage_populated',
    base: 'socialMutedListPage',
    populateFollowList: { type: 'muted', entries: BLACKLIST_TARGETS }
  },
  {
    name: 'socialBlacklistListPage_populated',
    base: 'socialBlacklistListPage',
    populateFollowList: { type: 'blacklisted', entries: BLACKLIST_TARGETS }
  },
  {
    name: 'socialFollowedBlacklistsPage_populated',
    base: 'socialFollowedBlacklistsPage',
    populateFollowList: { type: 'follow_blacklist', entries: BLACKLIST_TARGETS }
  },
  {
    name: 'socialFollowedMutedPage_populated',
    base: 'socialFollowedMutedPage',
    populateFollowList: { type: 'follow_muted', entries: BLACKLIST_TARGETS }
  }
];

/* ---------- file helpers ---------- */

function readBaseFixture(contentDir, filename) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, filename), 'utf8'));
}

function writeFixture(targetDir, filename, content) {
  fs.writeFileSync(
    path.join(targetDir, filename),
    JSON.stringify(content, null, 2) + '\n'
  );
}

/**
 * Walk the `_index.json:base` chain until we reach a dir that actually
 * holds JSON payloads. Lets a variant declare a pure-overlay parent
 * (e.g. `socialMute` is an overlay on `socialFollow` carrying only
 * `_index.json`) — the generator still patches the real recordings.
 *
 * Returns `{ contentDir, files }`. `contentDir` is the resolved dir
 * that owns the JSON files. The cycle cap is paranoia — the proxy
 * loader does the same kind of walk but doesn't enforce a bound, and a
 * mistakenly self-referencing `_index.json` would otherwise loop here.
 */
function resolveBaseContent(baseDir) {
  let current = baseDir;
  const visited = new Set();
  while (visited.size < 8) {
    if (visited.has(current)) break;
    visited.add(current);
    if (!fs.existsSync(current)) break;
    const files = fs
      .readdirSync(current)
      .filter((f) => f.endsWith('.json') && f !== '_index.json');
    if (files.length > 0) return { contentDir: current, files };
    const indexPath = path.join(current, '_index.json');
    if (!fs.existsSync(indexPath)) break;
    const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (!idx.base) break;
    current = path.join(FIXTURES_ROOT, idx.base);
  }
  return { contentDir: baseDir, files: [] };
}

/* ---------- patch ops ---------- */

/**
 * Each op exposes:
 *   fileSubstring: only consider base files whose name includes this
 *   apply(content, file, spec): mutate content in place; return true
 *     if a patch was applied, false if this file didn't match (e.g.
 *     wrong params.type), throw on unexpected shape.
 */
const OPS = {
  addFollowing: {
    fileSubstring: 'get_following',
    apply(content, file, spec) {
      // condenser_api.get_following uses positional params:
      // [account, start, type, limit]. bridge.get_following (if ever
      // used) would expose the same fields by name — handle both.
      const params = content.params;
      const type = Array.isArray(params) ? params[2] : params?.type;
      if (type !== spec.type) return false;
      const result = content.response?.result;
      if (!Array.isArray(result)) {
        throw new Error(`${file}: response.result expected to be an array`);
      }
      if (!result.some((e) => e?.following === spec.target)) {
        // The API records the relation kind in the same `what` array:
        // ['blog'] for follow, ['ignore'] for mute.
        const what = spec.type === 'blog' ? ['blog'] : ['ignore'];
        result.unshift({
          follower: FOLLOWER,
          following: spec.target,
          what
        });
      }
      return true;
    }
  },

  profileContext: {
    fileSubstring: 'bridge.get_profile',
    apply(content, file, spec) {
      const account = content.params?.account ?? content.params?.[0];
      if (account !== spec.account) return false;
      const result = content.response?.result;
      if (!result || typeof result !== 'object') {
        throw new Error(`${file}: response.result missing for ${spec.account}`);
      }
      result.context = result.context ?? {};
      if (spec.followed !== undefined) result.context.followed = spec.followed;
      if (spec.muted !== undefined) result.context.muted = spec.muted;
      return true;
    }
  },

  populateFollowList: {
    fileSubstring: 'bridge.get_follow_list',
    apply(content, file, spec) {
      const followType =
        content.params?.follow_type ?? content.params?.[1];
      if (followType !== spec.type) return false;
      if (!content.response) {
        throw new Error(`${file}: no response on which to set result`);
      }
      content.response.result = spec.entries.map((name) => ({
        name,
        blacklist_description: '',
        muted_list_description: ''
      }));
      return true;
    }
  }
};

/* ---------- driver ---------- */

function runVariant(variant) {
  const baseDir = path.join(FIXTURES_ROOT, variant.base);
  if (!fs.existsSync(baseDir)) {
    console.warn(
      `↷ ${variant.name}: base dir "${variant.base}" missing — skipping. ` +
        `Record with: pnpm --filter @hive/blog test:fixture:record -- ${variant.base}`
    );
    return;
  }

  const targetDir = path.join(FIXTURES_ROOT, variant.name);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  // Which op-kinds does this variant carry?
  const opKinds = Object.keys(variant).filter((k) => k in OPS);
  if (opKinds.length === 0) {
    throw new Error(`Variant ${variant.name} declares no patch operations`);
  }

  // Track how many files matched per op so a recording that lost an
  // expected RPC surfaces as a clear, op-specific error instead of an
  // empty overlay dir.
  const matchCountByOp = Object.fromEntries(opKinds.map((k) => [k, 0]));
  const overlayFiles = [];
  // baseDir may itself be a pure-overlay dir (only _index.json with a
  // `base:` pointer) — walk down to where the real JSON payloads live.
  const { contentDir, files: baseFiles } = resolveBaseContent(baseDir);

  for (const f of baseFiles) {
    const content = readBaseFixture(contentDir, f);
    let patchedAny = false;

    for (const kind of opKinds) {
      const op = OPS[kind];
      if (!f.includes(op.fileSubstring)) continue;
      const patched = op.apply(content, f, variant[kind]);
      if (patched) {
        matchCountByOp[kind] += 1;
        patchedAny = true;
      }
    }

    if (patchedAny) {
      writeFixture(targetDir, f, content);
      overlayFiles.push(f);
    }
  }

  // Each declared op must have touched at least one base file, otherwise
  // the variant is silently broken (would produce an "empty overlay" at
  // replay — base serves stale data and tests act on the wrong pre-state).
  for (const kind of opKinds) {
    if (matchCountByOp[kind] === 0) {
      throw new Error(
        `Variant ${variant.name}: op "${kind}" matched 0 base files (looking for ` +
          `*${OPS[kind].fileSubstring}* with the expected params). ` +
          `Did the base recording capture this RPC, or did its shape change?`
      );
    }
  }

  writeFixture(targetDir, '_index.json', {
    testName: variant.name,
    base: variant.base,
    generatedAt: new Date().toISOString(),
    overlayFiles
  });

  const opSummary = opKinds
    .map((k) => `${k}=${matchCountByOp[k]}`)
    .join(' ');
  console.log(
    `✓ ${variant.name}: base=${variant.base}, ${opSummary}, ` +
      `overlay=[${overlayFiles.join(', ')}]`
  );
}

for (const variant of VARIANTS) {
  runVariant(variant);
}
