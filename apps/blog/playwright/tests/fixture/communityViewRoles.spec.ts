import { test, expect } from '../support/fixture-proxy-test';
import { CommunityRolesPage } from '../support/pages/communityRolesPage';
import {
  MOD_COMMUNITY_TAG,
  ROLE_OWNER,
  ROLE_ROW_ADMIN,
  ROLE_ROW_MOD,
  gotoRolesPageLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-13 — View all roles / members in a community.
 *
 * The `/roles/<tag>` page reads `bridge.list_community_roles` and renders
 * one table row per member (`roles/[tag]/content.tsx` → `table-item.tsx`).
 * Viewing is NOT gated on the viewer's role, so no overlay is needed — the
 * seeded user (guest4test, a non-member here) sees the full list.
 *
 * ANON-TAG-07 already proves the page loads without crashing; COM-13's
 * value-add is asserting the table actually renders the role CONTENT —
 * account, raw role string, and per-user title — for the stable leadership
 * rows of hive-160391 (Blockchain Wizardry).
 *
 * Read-only: no broadcast, so no interceptor.
 */

test.use({
  fixtureTestName: 'communityModRolesPage',
  authenticatedUser: {}
});

test('COM-13 — View community roles', async ({ page }) => {
  await gotoRolesPageLoggedIn(page, MOD_COMMUNITY_TAG);

  const roles = new CommunityRolesPage(page);
  await expect(roles.heading).toBeVisible();
  await expect(roles.table).toBeVisible();

  // Multiple members render (owner + admin + mod at minimum).
  expect(await roles.roleRows.count()).toBeGreaterThanOrEqual(3);

  // The community account itself holds the "owner" row.
  await expect(roles.roleNameInRow(MOD_COMMUNITY_TAG)).toHaveText(ROLE_OWNER);

  // Leadership rows render account → raw role → title.
  await expect(roles.roleNameInRow(ROLE_ROW_ADMIN.account)).toHaveText(ROLE_ROW_ADMIN.role);
  await roles.expectRoleRow(ROLE_ROW_MOD); // gtg → mod → "Wizard"
});
