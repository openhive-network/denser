import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import {
  OBSERVER,
  OTHER_USER,
  gotoLoggedIn
} from '../support/postDisplayContext';

/**
 * §4 Post Display & Views — user profile tabs (logged-in observer).
 *
 * Covers VIEW-09..13 from the "Test Plan - Automation Test Cases" wiki:
 *   09: profile default (blog) page header + stats
 *   10: posts tab
 *   11: comments tab
 *   12: replies tab
 *   13: payouts tab
 * plus a VIEW-13b "own profile affordance" check that verifies the
 * Settings nav link only renders on the observer's own profile
 * (`profile-layout.tsx:471` is gated on
 * `user.isLoggedIn && username === user.username`).
 *
 * The fixture dir captures recordings for both `/@hiveio/*` (other-user
 * profile — same target as the anonymous `userProfileTabs/` fixture) and
 * `/@guest4test` (own profile — covers the differential affordance).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog exec \
 *            playwright test --config=playwright.fixture.config.ts \
 *            loggedInUserProfile.spec.ts
 *          node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
 *            apps/blog/playwright/tests/mock/fixtures/loggedInUserProfile
 */

test.use({
  fixtureTestName: 'loggedInUserProfile',
  authenticatedUser: {}
});

test.describe('§4 Post Display & Views — user profile (logged-in observer)', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
  });

  // ── VIEW-09: profile default (blog tab) ───────────────────────────────

  test('VIEW-09 — Profile page header and default Blog tab render', async ({ page }) => {
    await gotoLoggedIn(page, `/@${OTHER_USER}`);

    await expect(profilePage.profileInfo).toBeVisible();
    await expect(profilePage.profileName).toBeVisible();
    await expect(profilePage.profileStats).toBeVisible();
    await expect(profilePage.profileNav).toBeVisible();
    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  // ── VIEW-10: posts tab ────────────────────────────────────────────────

  test('VIEW-10 — Posts tab is active and list renders', async ({ page }) => {
    await gotoLoggedIn(page, `/@${OTHER_USER}/posts`);

    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuActiveTab).toHaveText('Posts');
    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  // ── VIEW-11: comments tab ─────────────────────────────────────────────

  test('VIEW-11 — Comments tab is active and list renders', async ({ page }) => {
    await gotoLoggedIn(page, `/@${OTHER_USER}/comments`);

    await expect(page).toHaveURL(/.*comments$/);
    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuActiveTab).toHaveText('Comments');
    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  // ── VIEW-12: replies tab ──────────────────────────────────────────────

  test('VIEW-12 — Replies tab is active and list renders', async ({ page }) => {
    await gotoLoggedIn(page, `/@${OTHER_USER}/replies`);

    await expect(page).toHaveURL(/.*replies$/);
    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  // ── VIEW-13: payouts tab ──────────────────────────────────────────────

  test('VIEW-13 — Payouts tab is active and either the list or empty-state renders', async ({ page }) => {
    await gotoLoggedIn(page, `/@${OTHER_USER}/payout`);

    await expect(page).toHaveURL(/.*payout$/);
    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuActiveTab).toHaveText('Payouts');
    // hiveio has no pending payouts at record time, so the empty-state
    // wrapper shows instead of the post list. Either is acceptable
    // (matches ANON-PROF-05's `.or(...)` pattern).
    await expect(
      profilePage.profileBlogPostsList.or(profilePage.userHasNotStartedBloggingYetMsg)
    ).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  // ── VIEW-13b: own-profile affordance differential ─────────────────────

  test('VIEW-13b — Settings nav link is visible only on own profile', async ({ page }) => {
    // On the observer's own profile, the Settings link shows in the
    // desktop nav (profile-layout.tsx:471 gates it on
    // `user.isLoggedIn && username === user.username`).
    await gotoLoggedIn(page, `/@${OBSERVER}`);
    await expect(profilePage.profileNav).toBeVisible();
    await expect(profilePage.profileSettingsLinkFor(OBSERVER)).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(profilePage.profileSettingsLinkFor(OBSERVER)).toHaveAttribute(
      'href',
      `/@${OBSERVER}/settings`
    );

    // On a different user's profile, the same link must not render — that
    // proves the gate fires on observer-vs-username identity, not just on
    // login state.
    await gotoLoggedIn(page, `/@${OTHER_USER}`);
    await expect(profilePage.profileNav).toBeVisible();
    await expect(profilePage.profileSettingsLinkFor(OTHER_USER)).toHaveCount(0);
  });
});
