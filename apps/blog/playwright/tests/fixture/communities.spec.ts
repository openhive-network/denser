import { test, expect } from '../support/fixture-proxy-test';
import { CommunitiesExplorePage } from '../support/pages/communitiesExplorerPage';
import { TagCommunityFeedsPage } from '../support/pages/tagCommunityFeedsPage';
import { TIMEOUTS } from '../support/constants';

/**
 * Communities directory fixture tests — covers section 1.6 of the
 * "Test Plan - Page View Verification (Anonymous & Logged-In User)" wiki.
 *
 * Scope: anonymous user, view/rendering verification only (no state mutation).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'communities' });

const COMMUNITY_TO_OPEN = 'LeoFinance';

test.describe('Communities directory (fixture-based)', () => {
  let communitiesExplorePage: CommunitiesExplorePage;
  let tagCommunityFeedsPage: TagCommunityFeedsPage;

  test.beforeEach(async ({ page }) => {
    communitiesExplorePage = new CommunitiesExplorePage(page);
    tagCommunityFeedsPage = new TagCommunityFeedsPage(page);
  });

  test('ANON-COMM-01 — Communities directory renders list and search field', async () => {
    await communitiesExplorePage.goto();

    await communitiesExplorePage.validateDirectoryStructure();
  });

  test('ANON-COMM-02 — First community card shows name, description, subscribers, rank ordering', async () => {
    await communitiesExplorePage.goto();

    // Default sort is "Rank" — first card represents rank #1
    await expect(communitiesExplorePage.comboboxDefaultValue).toHaveText('Rank');
    await communitiesExplorePage.validateFirstCardStructure();
  });

  test('ANON-COMM-03 — Clicking a community in the directory opens its feed page', async ({ page }) => {
    await communitiesExplorePage.goto();

    await Promise.all([
      page.waitForURL(/\/trending\/.+/, { timeout: TIMEOUTS.HYDRATION }),
      communitiesExplorePage.communityTitleLinkByName(COMMUNITY_TO_OPEN).click()
    ]);

    await tagCommunityFeedsPage.validateCommunitySidebarVisible();
    await expect(tagCommunityFeedsPage.communityName.first()).toHaveText(COMMUNITY_TO_OPEN);
  });
});
