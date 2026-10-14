import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import {
  expectOnlyFirstCardImagePreloaded,
  getFirstCardImageUrl,
  recordImageRequests
} from '../support/cardImagePreload';
import { prependHiddenStreamedCopy } from '../support/hiddenStreamedCopy';

/**
 * User Profile Tabs fixture tests — Section 1.4 of the Test Plan:
 * "Page View Verification (Anonymous & Logged In User)"
 *
 * Covers ANON-PROF-01 through ANON-PROF-10:
 *   01 – Profile default (blog) page header + stats
 *   02 – Posts tab active (inner sub-menu "Posts")
 *   03 – Comments tab active (inner sub-menu "Comments")
 *   04 – Replies tab active
 *   05 – Payout tab active (inner sub-menu "Payouts")
 *   06 – Followed list renders (or empty state)
 *   07 – Followers list renders (or empty state)
 *   08 – Communities tab renders community subscriptions
 *   09 – Profile nav tabs structure (main + Posts sub-tabs)
 *   09b – Posts sub-menu is a link nav with aria-current, not ARIA tabs
 *   10 – Non-existent user → 404
 *   11 – Profile server HTML preloads only the first card image
 *   12 – Profile fetches the preloaded first card image only once
 *   13 – Profile without on-chain `profile.social` shows no social links
 *   14 – Post list locators resolve to the visible copy right after domcontentloaded
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'userProfileTabs' });

test.describe('User Profile Tabs tests (fixture-based)', () => {
  const user = 'hiveio';

  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
  });

  // ── ANON-PROF-01: Profile default (blog) ─────────────────────────────

  test('ANON-PROF-01: profile default page shows header, stats and default tab', async () => {
    await profilePage.gotoProfilePage(`@${user}`);

    await expect(profilePage.profileInfo).toBeVisible();
    await expect(profilePage.profileName).toBeVisible();
    await expect(profilePage.userBannerLevelLink).toBeVisible();
    await expect(profilePage.userBannerLevelImg).toBeVisible();

    await expect(profilePage.profileStats).toBeVisible();
    await expect(profilePage.profileFollowers).toBeVisible();
    await expect(profilePage.profileNumberOfPosts).toBeVisible();
    await expect(profilePage.profileFollowing).toBeVisible();
    await expect(profilePage.profileHP).toBeVisible();

    await expect(profilePage.profileNav).toBeVisible();
    await expect(profilePage.profileBlogPostsList).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  // ── ANON-PROF-02: Posts tab ──────────────────────────────────────────

  test('ANON-PROF-02: posts tab is active and post list renders', async () => {
    await profilePage.gotoPostsProfilePage(`@${user}`);
    await profilePage.profilePostsTabIsSelected();

    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuActiveTab).toHaveText('Posts');
    await expect(profilePage.profileBlogPostsList).toBeVisible();
  });

  // ── ANON-PROF-03: Comments tab ───────────────────────────────────────

  test('ANON-PROF-03: comments tab is active and comments list renders', async ({ page }) => {
    await profilePage.gotoPostsCommentsProfilePage(`@${user}`);

    await expect(page).toHaveURL(/.*comments/);
    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuActiveTab).toHaveText('Comments');
    await expect(profilePage.profileBlogPostsList).toBeVisible();
  });

  // ── ANON-PROF-04: Replies tab ────────────────────────────────────────

  test('ANON-PROF-04: replies tab is active and replies list renders', async () => {
    await profilePage.gotoRepliesProfilePage(`@${user}`);
    await profilePage.profileRepliesTabIsSelected();

    await expect(profilePage.profileBlogPostsList).toBeVisible();
  });

  // ── ANON-PROF-05: Payout tab ─────────────────────────────────────────

  test('ANON-PROF-05: payout tab is active and list renders (or empty state)', async ({ page }) => {
    await profilePage.gotoPostsPayoutsProfilePage(`@${user}`);

    await expect(page).toHaveURL(/.*payout/);
    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuActiveTab).toHaveText('Payouts');

    // Either the post list or the "No pending payouts" empty state renders.
    await expect(
      profilePage.profileBlogPostsList.or(profilePage.userHasNotStartedBloggingYetMsg)
    ).toBeVisible();
  });

  // ── ANON-PROF-06: Followed list ──────────────────────────────────────

  test('ANON-PROF-06: followed list renders with header and list container', async () => {
    await profilePage.gotoFollowedProfilePage(user);

    await expect(profilePage.profileInfo).toBeVisible();
    await expect(profilePage.followedFollowersPageHeading).toBeVisible();
    await expect(profilePage.followedFollowersPageHeading).toHaveText(/^Followed page/);
    await expect(profilePage.followedFollowersList).toBeAttached();
  });

  // ── ANON-PROF-07: Followers list ─────────────────────────────────────

  test('ANON-PROF-07: followers list renders with header and at least one entry', async () => {
    await profilePage.gotoFollowersProfilePage(user);

    await expect(profilePage.profileInfo).toBeVisible();
    await expect(profilePage.followedFollowersPageHeading).toBeVisible();
    await expect(profilePage.followedFollowersPageHeading).toHaveText(/^Followers page/);

    const count = await profilePage.followedFollowersListItems.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── ANON-PROF-08: Communities (Social) tab ───────────────────────────

  test('ANON-PROF-08: communities tab renders community subscriptions list', async ({ page }) => {
    await profilePage.gotoCommunitiesProfilePage(`@${user}`);

    await expect(page).toHaveURL(/.*communities/);
    await expect(profilePage.socialCommunitySubscriptionsLabel).toBeVisible();
    await expect(profilePage.socialCommunitySubscriptionsDescription).toBeVisible();
    await expect(profilePage.socialAuthorSubscribedCommunitiesList).toBeVisible();

    const subscriptionCount = await profilePage.socialAuthorSubscribedCommunitiesListItem.count();
    expect(subscriptionCount).toBeGreaterThan(0);
  });

  // ── ANON-PROF-09: Profile nav tabs structure ─────────────────────────

  test('ANON-PROF-09: profile navigation exposes expected main tabs and Posts sub-tabs', async () => {
    await profilePage.gotoProfilePage(`@${user}`);

    await expect(profilePage.profileNav).toBeVisible();

    // Main profile nav for anonymous viewer of another user: Blog, Posts,
    // Replies, Social, Notifications (Settings is own-profile only).
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profilePostsLink).toBeVisible();
    await expect(profilePage.profileRepliesLink).toBeVisible();
    await expect(profilePage.profileSocialLink).toBeVisible();
    await expect(profilePage.profileNotificationsLink).toBeVisible();

    // Comments and Payouts live inside the Posts tab's sub-menu.
    await profilePage.gotoPostsProfilePage(`@${user}`);
    await expect(profilePage.postsMenu).toBeVisible();
    await expect(profilePage.postsMenuPostsButton).toBeVisible();
    await expect(profilePage.postsMenuCommentsButton).toBeVisible();
    await expect(profilePage.postsMenuPayoutsButton).toBeVisible();
  });

  test('ANON-PROF-09b: Posts sub-menu is a link nav marking the current page', async () => {
    await profilePage.gotoPostsCommentsProfilePage(`@${user}`);

    await expect(profilePage.postsMenu).toHaveRole('navigation');
    await expect(profilePage.postsMenu.getByRole('tab')).toHaveCount(0);
    await expect(profilePage.postsMenu.locator('button a')).toHaveCount(0);

    const links = profilePage.postsMenu.getByRole('link');
    await expect(links).toHaveCount(3);
    await expect(profilePage.postsMenuActiveTab).toHaveCount(1);
    await expect(profilePage.postsMenuActiveTab).toHaveText('Comments');
    await expect(profilePage.postsMenuActiveTab).toHaveAttribute('href', `/@${user}/comments`);
  });

  // ── ANON-PROF-10: Non-existent user ──────────────────────────────────

  test('ANON-PROF-10: non-existent user renders 404 not-found page', async () => {
    await profilePage.gotoNonExistentProfilePage('thisuserdoesnotexistxyz');

    await expect(profilePage.notFoundPage).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(profilePage.notFoundHeading).toHaveText('404');
  });

  // ── ANON-PROF-11/12: First card image preload ────────────────────────

  test('ANON-PROF-11: profile server HTML preloads only the first card image', async ({ page }) => {
    const serverHtml = await (await page.request.get(`/@${user}`)).text();

    expectOnlyFirstCardImagePreloaded(serverHtml);
  });

  test('ANON-PROF-12: profile fetches the preloaded first card image only once', async ({ page }) => {
    const serverHtml = await (await page.request.get(`/@${user}`)).text();
    const firstCardImageUrl = getFirstCardImageUrl(serverHtml);
    expect(firstCardImageUrl).toBeTruthy();
    const firstCardImageRequests = await recordImageRequests(page, firstCardImageUrl);

    await page.goto(`/@${user}`, { waitUntil: 'load' });
    await expect(profilePage.profileBlogPostsList).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await page.waitForLoadState('networkidle');

    expect(firstCardImageRequests).toHaveLength(1);
  });

  // ── ANON-PROF-13: No on-chain social links ───────────────────────────

  test('ANON-PROF-13: profile without profile.social shows no social links', async () => {
    await profilePage.gotoProfilePage(`@${user}`);

    await expect(profilePage.profileName).toBeVisible();
    await expect(profilePage.onChainSocialLinks).toHaveCount(0);
  });

  // ── ANON-PROF-14: Hidden streamed copy ───────────────────────────────
  // A direct load can briefly hold React's hidden streamed copy of the page next to the
  // client-rendered one; post list locators must resolve to the visible copy alone.

  test('ANON-PROF-14: post list locators resolve to the visible copy right after domcontentloaded', async ({
    page
  }) => {
    await page.goto(`/@${user}/posts`, { waitUntil: 'domcontentloaded' });
    await expect(profilePage.profileBlogPostsList.first()).toBeVisible();
    const lists = await profilePage.profileBlogPostsList.count();
    const items = await profilePage.postBlogItem.count();

    await prependHiddenStreamedCopy(page, 'post-list-profile-blog-list');

    await expect(profilePage.profileBlogPostsList).toHaveCount(lists);
    await expect(profilePage.postBlogItem).toHaveCount(items);
    await expect(profilePage.postBlogItem.first()).toBeVisible();
    await expect(profilePage.profileBlogPostsList.first().or(profilePage.userHasNotStartedBloggingYetMsg)).toBeVisible();
  });
});
