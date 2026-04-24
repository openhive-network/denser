import { test, expect } from '../support/fixture-proxy-test';
import { TagCommunityFeedsPage } from '../support/pages/tagCommunityFeedsPage';

/**
 * Tag / Community Feeds fixture tests — covers section 1.2 of the
 * "Test Plan - Page View Verification (Anonymous & Logged-In User)" wiki.
 *
 * Scope: anonymous user, view/rendering verification only (no state mutation).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'tagCommunityFeeds' });

const COMMUNITY_TAG = 'hive-139531';
const NON_EXISTENT_TAG = 'hive-000000000';

test.describe('Tag / Community Feeds (fixture-based)', () => {
  let tagCommunityFeedsPage: TagCommunityFeedsPage;

  test.beforeEach(async ({ page }) => {
    tagCommunityFeedsPage = new TagCommunityFeedsPage(page);
  });

  test('ANON-TAG-01 — Trending by tag renders community header and feed', async () => {
    await tagCommunityFeedsPage.gotoTagFeed('trending', COMMUNITY_TAG);

    await tagCommunityFeedsPage.validateCommunityHeaderVisible();
    await tagCommunityFeedsPage.validateFeedHasPosts();
    await tagCommunityFeedsPage.validateFilterActive('Trending');
  });

  test('ANON-TAG-02 — Hot by tag renders feed list', async () => {
    await tagCommunityFeedsPage.gotoTagFeed('hot', COMMUNITY_TAG);

    await tagCommunityFeedsPage.validateFeedHasPosts();
    await tagCommunityFeedsPage.validateFilterActive('Hot');
  });

  test('ANON-TAG-03 — New by tag renders feed list', async () => {
    await tagCommunityFeedsPage.gotoTagFeed('created', COMMUNITY_TAG);

    await tagCommunityFeedsPage.validateFeedHasPosts();
    await tagCommunityFeedsPage.validateFilterActive('New');
  });

  test('ANON-TAG-04 — Payout by tag renders feed list', async () => {
    await tagCommunityFeedsPage.gotoTagFeed('payout', COMMUNITY_TAG);

    await tagCommunityFeedsPage.validateFeedHasPosts();
    await tagCommunityFeedsPage.validateFilterActive('Payouts');
  });

  test('ANON-TAG-05 — Muted by tag page loads with "Muted" filter active', async () => {
    await tagCommunityFeedsPage.gotoTagFeed('muted', COMMUNITY_TAG);

    await tagCommunityFeedsPage.validateFilterActive('Muted');
    await tagCommunityFeedsPage.validateCommunityHeaderVisible();
  });

  test('ANON-TAG-06 — Community page renders header and feed', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await tagCommunityFeedsPage.gotoTagFeed('trending', COMMUNITY_TAG);

    await tagCommunityFeedsPage.waitForFeedToRender();
    await tagCommunityFeedsPage.validateCommunityHeaderVisible();
    await tagCommunityFeedsPage.validateFeedHasPosts();
  });

  test('ANON-TAG-07 — Community roles page loads without crashing', async ({ page }) => {
    await tagCommunityFeedsPage.gotoRoles(COMMUNITY_TAG);

    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(`/roles/${COMMUNITY_TAG}`);
    await expect(tagCommunityFeedsPage.communityName.first()).toBeVisible();
  });

  test('ANON-TAG-08 — Non-existent tag renders empty feed or 404 without crashing', async ({ page }) => {
    await tagCommunityFeedsPage.gotoTagFeed('trending', NON_EXISTENT_TAG);

    await tagCommunityFeedsPage.validateEmptyOrNotFound();
    expect(page.url()).toContain(NON_EXISTENT_TAG);
  });
});
