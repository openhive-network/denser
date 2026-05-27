import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunityRolesPage } from '../support/pages/communityRolesPage';
import {
  SUBSCRIBER,
  MOD_COMMUNITY_TAG,
  ACTION_SET_ROLE,
  ROLE_MOD,
  TOAST_ROLE_UPDATED,
  gotoRolesPageLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-09 — Set a user's role via the community roles page.
 *
 *   Wire — custom_json id="community", json: ["setRole", { community, account, role }].
 *   Toast — "Role updated successfully for <account> in community <community>."
 *           (use-set-role-mutations.ts:68).
 *   Precondition — the AddRole panel (roles/content.tsx) only renders for a
 *           viewer at role-level >= member. guest4test is a plain non-member
 *           on hive-160391, so the `communitySetRole` overlay injects it as
 *           admin into bridge.list_community_roles (generate-community-
 *           variants.mjs). Overlays the COM-13 base communityModRolesPage —
 *           no separate recording; the setRole broadcast is captured live.
 *
 * confirmInBlock IS MANDATORY: useSetRoleMutation runs setRole with
 * { observe: true }, so WorkerBee needs the captured trx delivered in a
 * synthetic block before onSuccess fires the toast.
 */

const ROLE_TARGET_USER = 'guest4test2';

test.use({
  fixtureTestName: 'communitySetRole',
  authenticatedUser: {}
});

test('COM-09 — Set user role via community roles page', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoRolesPageLoggedIn(page, MOD_COMMUNITY_TAG);

  const roles = new CommunityRolesPage(page);
  // Admin precondition — AddRole renders only because the overlay made the
  // seeded viewer an admin (otherwise loggedUser.value < 3 hides it).
  await expect(roles.addRoleTrigger).toBeVisible();

  await roles.addRole(ROLE_TARGET_USER, ROLE_MOD);
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_SET_ROLE,
    payload: { community: MOD_COMMUNITY_TAG, account: ROLE_TARGET_USER, role: ROLE_MOD }
  });

  await expect(
    page.getByText(TOAST_ROLE_UPDATED(ROLE_TARGET_USER, MOD_COMMUNITY_TAG), {
      exact: true
    })
  ).toBeVisible();
});
