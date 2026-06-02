import { Locator, Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../constants';

/**
 * Page Object for Tag / Community feed views (ANON-TAG-01..08).
 *
 * Covers `/trending/[tag]`, `/hot/[tag]`, `/created/[tag]`, `/payout/[tag]`,
 * `/muted/[tag]` and `/roles/[tag]` pages — both for community tags
 * (e.g. `hive-139531`) and plain content tags, as well as the 404 fallback
 * for non-existent tags.
 */
export class TagCommunityFeedsPage {
  readonly page: Page;

  readonly postListItems: Locator;
  readonly firstPostItem: Locator;
  readonly postAuthors: Locator;
  readonly firstPostTitle: Locator;

  readonly communityInfoSidebar: Locator;
  readonly communityName: Locator;
  readonly communitySubscribers: Locator;
  readonly communityPendingRewards: Locator;
  readonly communityActivePosters: Locator;
  readonly communityShortDescription: Locator;
  readonly communityDescriptionRulesSidebar: Locator;
  readonly communityDescription: Locator;
  readonly communityLeadership: Locator;

  readonly postsFilter: Locator;

  readonly rolesHeading: Locator;
  readonly rolesTable: Locator;
  readonly rolesTableHeader: Locator;
  readonly rolesTableRows: Locator;
  readonly rolesAccountHeader: Locator;
  readonly rolesRoleHeader: Locator;
  readonly rolesTitleHeader: Locator;

  readonly notFoundHeading: Locator;
  readonly noDataError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.postListItems = page.locator('[data-testid="post-list-item"]');
    this.firstPostItem = this.postListItems.first();
    this.postAuthors = page.locator('[data-testid="post-author"]');
    this.firstPostTitle = this.postListItems.first().locator('[data-testid="post-title"]');

    this.communityInfoSidebar = page.locator('[data-testid="community-info-sidebar"]');
    this.communityName = page.locator('[data-testid="community-name"]');
    this.communitySubscribers = page.locator('[data-testid="community-subscribers"]');
    this.communityPendingRewards = page.locator('[data-testid="community-pending-rewards"]');
    this.communityActivePosters = page.locator('[data-testid="community-active-posters"]');
    this.communityShortDescription = page.locator('[data-testid="short-community-description"]');
    this.communityDescriptionRulesSidebar = page.locator(
      '[data-testid="community-description-rules-sidebar"]'
    );
    this.communityDescription = page.locator('[data-testid="community-description"]');
    this.communityLeadership = page.locator('[data-testid="community-leadership"]');

    this.postsFilter = page.locator('[data-testid="posts-filter"]');

    this.rolesHeading = page.getByRole('heading', { name: 'User roles' });
    this.rolesTable = page.locator('table');
    this.rolesTableHeader = this.rolesTable.locator('thead');
    this.rolesTableRows = this.rolesTable.locator('tbody tr');
    this.rolesAccountHeader = this.rolesTableHeader.getByRole('columnheader', { name: 'Account' });
    this.rolesRoleHeader = this.rolesTableHeader.getByRole('columnheader', { name: 'Role' });
    this.rolesTitleHeader = this.rolesTableHeader.getByRole('columnheader', { name: 'Title' });

    this.notFoundHeading = page.getByRole('heading', { name: /page not found|404/i });
    this.noDataError = page.getByTestId('no-data-error');
  }

  async gotoTagFeed(sort: 'trending' | 'hot' | 'created' | 'payout' | 'muted', tag: string) {
    await this.page.goto(`/${sort}/${tag}`, { waitUntil: 'domcontentloaded' });
  }

  async gotoRoles(tag: string) {
    await this.page.goto(`/roles/${tag}`, { waitUntil: 'domcontentloaded' });
  }

  async waitForFeedToRender() {
    await this.page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
  }

  async validateFeedHasPosts() {
    await expect(this.postListItems.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    const count = await this.postListItems.count();
    expect(count).toBeGreaterThan(0);
  }

  async validateCommunityHeaderVisible() {
    await expect(this.communityName.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(this.communityName.first()).not.toHaveText('');
  }

  async validateCommunitySidebarVisible() {
    await expect(this.communityInfoSidebar).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(this.communityName.first()).toBeVisible();
    await expect(this.communitySubscribers).toBeVisible();
    await expect(this.communityShortDescription).toBeVisible();
  }

  async validateFilterActive(label: 'Trending' | 'Hot' | 'New' | 'Payouts' | 'Muted') {
    await expect(this.postsFilter).toHaveText(label, { timeout: TIMEOUTS.HYDRATION });
  }

  async validateRolesTableRendered() {
    await expect(this.rolesHeading).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(this.rolesTable).toBeVisible();
    await expect(this.rolesAccountHeader).toBeVisible();
    await expect(this.rolesRoleHeader).toBeVisible();
    await expect(this.rolesTitleHeader).toBeVisible();
    const rowCount = await this.rolesTableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  }

  async validateEmptyOrNotFound() {
    // For `hive-<digits>` community-tags that don't exist the API returns a
    // JSON-RPC error; SSR catches it and renders <NoDataError/>. For plain
    // non-existent tags the API returns an empty array and the feed renders
    // empty. Either outcome is "didn't crash" — assert on whichever shows up.
    await expect(this.noDataError.or(this.postListItems.first()).first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    if ((await this.postListItems.count()) === 0) {
      await expect(this.noDataError).toBeVisible();
    }
  }
}
