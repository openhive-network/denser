#!/usr/bin/env node
/**
 * Generates overlay fixture dirs for §10 Communities pre-state — chiefly
 * "viewer is admin/mod on this community" overlays so the moderation
 * surface (edit-props dialog opener, add-role panel, change-title
 * dialog, pin/unpin post-card menu items) actually renders during
 * replay. guest4test is a plain guest on every community on mainnet, so
 * recordings naturally lack the admin context the spec needs.
 *
 * Mirrors the pattern of generate-social-variants.mjs: walks each base
 * dir, patches the smallest set of read-only RPC responses, and writes
 * only the patched files (+ `_index.json` with `base:`) into a sibling
 * variant dir.
 *
 * Usage:
 *   1) Record the base scenarios:
 *        cd apps/blog && FIXTURE_MODE=record pnpm exec playwright \
 *          test --config=playwright.fixture.config.ts communityModBase
 *   2) Regenerate the community variants:
 *        node playwright/tests/support/fixture-auth/generate-community-variants.mjs
 *   3) Replay all §10 tests:
 *        pnpm --filter @hive/blog test:fixture -- community
 *
 * Patch operations (per-variant flags):
 *   - communityContext:  set `context.subscribed`/`context.role`/`context.title`
 *                        on `bridge.get_community` responses whose params.name
 *                        matches `spec.community`.
 *   - communityRoles:    rewrite `bridge.list_community_roles` for `spec.community`
 *                        to add `[spec.account, spec.role, '']` at the head of
 *                        the response (or replace existing entry for that account).
 *
 * Observed RPC shapes (verified against recorded fixtures):
 *   bridge.get_community
 *     params:   { name, observer? }
 *     result:   { name, title, context: { subscribed, role, title }, ... }
 *   bridge.list_community_roles
 *     params:   { community }
 *     result:   [[account, role, title], ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', 'mock', 'fixtures');

const SUBSCRIBER = process.env.CI_TEST_USER || 'guest4test';

const VARIANTS = [
  // COM-09 — set user role. Overlays the COM-13 base (logged-in
  // /roles/hive-160391) by injecting SUBSCRIBER as admin into
  // bridge.list_community_roles, so the AddRole panel renders (gated on the
  // viewer's role level >= member). community tag mirrors
  // MOD_COMMUNITY_TAG in communityContext.ts.
  {
    name: 'communitySetRole',
    base: 'communityModRolesPage',
    communityRoles: {
      community: 'hive-160391',
      account: SUBSCRIBER,
      role: 'admin',
      title: ''
    }
  },
  // COM-08 — edit community properties. Overlays the logged-in community
  // page (/trending/hive-139531) by injecting SUBSCRIBER as admin into
  // get_community.team, so the EditCommunityDialog renders in the sidebar.
  {
    name: 'communityEditProps',
    base: 'loggedInTagCommunityFeeds',
    communityTeam: {
      community: 'hive-139531',
      account: SUBSCRIBER,
      role: 'admin',
      title: ''
    }
  },
  // COM-10 / COM-11 / COM-12 — post-page moderation (change title, pin,
  // unpin). Overlays the logged-in post detail (gtg's depth-0 post in
  // hive-160391) by injecting SUBSCRIBER as mod into list_community_roles,
  // so `userCanModerate` is true and the pin/unpin + change-title controls
  // render. One overlay serves all three specs (same page state).
  {
    name: 'communityModeratePost',
    base: 'loggedInPostDetail',
    communityRoles: {
      community: 'hive-160391',
      account: SUBSCRIBER,
      role: 'mod',
      title: ''
    }
  },
  // ── Re-recording the `communityModeratePostFeed` base ──────────────────────
  // It is a PURE overlay base — no spec drives it (COM-11/12 read its dir, not
  // a test). It can't be re-recorded via COM-11/12 either: at record time
  // guest4test is not a mod, so the pin button never renders and the flow can't
  // reach the feed navigation. To re-record, temporarily add
  // playwright/tests/fixture/_recordCommunityFeed.spec.ts:
  //
  //   import { test, expect } from '../support/fixture-proxy-test';
  //   import { gotoLoggedIn } from '../support/postDisplayContext';
  //   import { MOD_COMMUNITY_TAG, PIN_POST_AUTHOR, PIN_POST_PERMLINK }
  //     from '../support/communityContext';
  //   test.use({ fixtureTestName: 'communityModeratePostFeed', authenticatedUser: {} });
  //   test('record base', async ({ page }) => {
  //     await gotoLoggedIn(page, `/${MOD_COMMUNITY_TAG}/@${PIN_POST_AUTHOR}/${PIN_POST_PERMLINK}/`);
  //     await expect(page.getByTestId('article-title')).toBeVisible();
  //     await gotoLoggedIn(page, `/trending/${MOD_COMMUNITY_TAG}`);
  //     await expect(page.getByTestId('post-list-item').first()).toBeVisible();
  //   });
  //
  // Then, from apps/blog:
  //   FIXTURE_MODE=record pnpm exec playwright test \
  //     --config=playwright.fixture.config.ts _recordCommunityFeed
  //   node playwright/tests/support/fixture-auth/trim-fixtures.mjs \
  //     playwright/tests/mock/fixtures/communityModeratePostFeed
  // Delete the temp spec, then re-run THIS generator to refresh the overlays.
  // ────────────────────────────────────────────────────────────────────────────

  // COM-11 — pin. Mod role over the feed-inclusive base; the feed already has
  // gtg/hive-hardfork-28 pinned, so the spec asserts the tag is shown.
  {
    name: 'communityPinPost',
    base: 'communityModeratePostFeed',
    communityRoles: {
      community: 'hive-160391',
      account: SUBSCRIBER,
      role: 'mod',
      title: ''
    }
  },
  // COM-12 — unpin. Mod role + un-pin the post in the feed, so the spec
  // asserts the pinned tag is gone after unpinning.
  {
    name: 'communityUnpinPost',
    base: 'communityModeratePostFeed',
    communityRoles: {
      community: 'hive-160391',
      account: SUBSCRIBER,
      role: 'mod',
      title: ''
    },
    feedUnpin: {
      author: 'gtg',
      permlink: 'hive-hardfork-28-jump-starter-kit'
    }
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

const OPS = {
  communityContext: {
    fileSubstring: 'bridge.get_community',
    apply(content, file, spec) {
      const name = content.params?.name ?? content.params?.[0];
      if (name !== spec.community) return false;
      const result = content.response?.result;
      if (!result || typeof result !== 'object') {
        throw new Error(`${file}: response.result missing for ${spec.community}`);
      }
      result.context = result.context ?? {};
      if (spec.subscribed !== undefined) result.context.subscribed = spec.subscribed;
      if (spec.role !== undefined) result.context.role = spec.role;
      if (spec.title !== undefined) result.context.title = spec.title;
      return true;
    }
  },

  communityRoles: {
    fileSubstring: 'bridge.list_community_roles',
    apply(content, file, spec) {
      const community = content.params?.community ?? content.params?.[0];
      if (community !== spec.community) return false;
      const result = content.response?.result;
      if (!Array.isArray(result)) {
        throw new Error(`${file}: response.result expected to be an array`);
      }
      const newEntry = [spec.account, spec.role, spec.title ?? ''];
      // Replace existing entry for the same account, otherwise prepend.
      const idx = result.findIndex((row) => row?.[0] === spec.account);
      if (idx >= 0) {
        result[idx] = newEntry;
      } else {
        result.unshift(newEntry);
      }
      return true;
    }
  },

  // Inject (or replace) a member in `bridge.get_community`'s `team` array.
  // The community-page sidebar (community-description.tsx) gates the
  // EditCommunityDialog on `team.find(e => e[0] === user && e[1] === 'admin')`,
  // so COM-08 needs SUBSCRIBER present as admin in `team`. Appends to keep
  // the owner at index 0 (the leadership list renders `team.slice(1)`).
  communityTeam: {
    fileSubstring: 'bridge.get_community',
    apply(content, file, spec) {
      const name = content.params?.name ?? content.params?.[0];
      if (name !== spec.community) return false;
      const result = content.response?.result;
      if (!result || typeof result !== 'object') {
        throw new Error(`${file}: response.result missing for ${spec.community}`);
      }
      const team = Array.isArray(result.team) ? result.team : [];
      const entry = [spec.account, spec.role, spec.title ?? ''];
      const idx = team.findIndex((member) => member?.[0] === spec.account);
      if (idx >= 0) {
        team[idx] = entry;
      } else {
        team.push(entry);
      }
      result.team = team;
      return true;
    }
  },

  // Clear `stats.is_pinned` on a post in `bridge.get_ranked_posts` (the
  // community feed). COM-12 needs the previously-pinned post to render WITHOUT
  // the pinned tag after unpin. Matches by author+permlink across feed files.
  feedUnpin: {
    fileSubstring: 'bridge.get_ranked_posts',
    apply(content, file, spec) {
      const result = content.response?.result;
      if (!Array.isArray(result)) return false;
      let changed = false;
      for (const post of result) {
        if (post?.author === spec.author && post?.permlink === spec.permlink && post?.stats) {
          post.stats.is_pinned = false;
          changed = true;
        }
      }
      return changed;
    }
  }
};

/* ---------- driver ---------- */

function runVariant(variant) {
  const baseDir = path.join(FIXTURES_ROOT, variant.base);
  if (!fs.existsSync(baseDir)) {
    console.warn(
      `↷ ${variant.name}: base dir "${variant.base}" missing — skipping. ` +
        `Record with: cd apps/blog && FIXTURE_MODE=record pnpm exec ` +
        `playwright test --config=playwright.fixture.config.ts ${variant.base}`
    );
    return;
  }

  const targetDir = path.join(FIXTURES_ROOT, variant.name);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const opKinds = Object.keys(variant).filter((k) => k in OPS);
  if (opKinds.length === 0) {
    throw new Error(`Variant ${variant.name} declares no patch operations`);
  }

  const matchCountByOp = Object.fromEntries(opKinds.map((k) => [k, 0]));
  const overlayFiles = [];
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

  const opSummary = opKinds.map((k) => `${k}=${matchCountByOp[k]}`).join(' ');
  console.log(
    `✓ ${variant.name}: base=${variant.base}, ${opSummary}, ` +
      `overlay=[${overlayFiles.join(', ')}]`
  );
}

// Pin SUBSCRIBER so it's not flagged unused while VARIANTS is empty.
void SUBSCRIBER;

if (VARIANTS.length === 0) {
  console.log(
    'generate-community-variants: no variants declared yet — add entries ' +
      'to VARIANTS in this script.'
  );
} else {
  for (const variant of VARIANTS) {
    runVariant(variant);
  }
}
