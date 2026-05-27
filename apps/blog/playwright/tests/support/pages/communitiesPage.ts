import { Locator, Page, expect } from '@playwright/test';

export class CommunitiesPage {
  readonly page: Page;
  readonly postTitle: Locator;
  readonly communityNameTitle: Locator;
  readonly communityInfoSidebar: Locator;
  readonly communityDescriptionSidebar: Locator;
  readonly communityShortDescription: Locator;
  readonly commnnitySubscribers: Locator;
  readonly communityPendingRewards: Locator;
  readonly communityActivePosters: Locator;
  readonly communitySubscribeButton: Locator;
  readonly communitySubscribeButtonMobilePage: Locator;
  readonly communityJoinedLeaveButton: Locator;
  readonly communityNewPostButton: Locator;
  readonly communityNewPostButtonMobilePage: Locator;
  readonly communityLeadership: Locator;
  readonly communityLeadershipHeader: Locator;
  readonly communityLeadershipList: Locator;
  readonly communityDescription: Locator;
  readonly communityDescriptionHeader: Locator;
  readonly communityDescriptionConntent: Locator;
  readonly communityRules: Locator;
  readonly communityRulesHeader: Locator;
  readonly communityRulesContent: Locator;

  readonly getFirstPostListItem: Locator;
  readonly getFirstPostCardAvatar: Locator;
  readonly getFirstPostAuthor: Locator;
  readonly getFirstPostAuthorReputation: Locator;
  readonly getFirstPostCardTimestampLink: Locator;
  readonly getFirstResponses: Locator;
  readonly postCardResponses: Locator;
  readonly languageHeader: Locator;
  readonly communityChoosenLanguage: Locator;
  readonly communityPinnedPost: Locator;
  readonly activityLogButton: Locator;

  readonly subscribersNotificationContent: Locator;
  readonly subscribersNotificationLocalMenu: Locator
  readonly subscriberName: Locator;
  readonly subscriberRow: Locator;
  readonly subscribersRowsEven: Locator;
  readonly subscribersRowsOdd: Locator;
  readonly subscribersLoadMoreButton: Locator;
  readonly unmoderatedName: Locator;

  readonly editPropsTrigger: Locator;
  readonly editTitleInput: Locator;
  readonly editAboutInput: Locator;
  readonly editDescriptionInput: Locator;
  readonly editFlagTextInput: Locator;
  readonly editNsfwCheckbox: Locator;
  readonly editSaveButton: Locator;
  readonly editCancelButton: Locator;
  readonly communityNsfwBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.postTitle = page.getByTestId('post-title');
    this.communityNameTitle = page.locator('[data-testid="community-name"]');
    this.communityInfoSidebar = page.locator('[data-testid="community-info-sidebar"]');
    this.communityDescriptionSidebar = page.locator('[data-testid="community-description-rules-sidebar"]');
    this.communityShortDescription = page.locator('[data-testid="short-community-description"]');
    this.commnnitySubscribers = page.locator('[data-testid="community-subscribers"]');
    this.communityPendingRewards = page.locator('[data-testid="community-pending-rewards"]');
    this.communityActivePosters = page.locator('[data-testid="community-active-posters"]');

    this.communitySubscribeButton = page.locator('[data-testid="community-info-sidebar"] [data-testid="community-subscribe-button"]');
    this.communitySubscribeButtonMobilePage = page.locator('[data-testid="community-simple-description-sidebar"] [data-testid="community-subscribe-button"]');

    this.communityJoinedLeaveButton = page.locator('[data-testid="community-info-sidebar"] [data-testid="community-join-leave-button"]');

    this.communityNewPostButton = page.locator('[data-testid="community-info-sidebar"] [data-testid="community-new-post-button"]');
    this.communityNewPostButtonMobilePage = page.locator('[data-testid="community-simple-description-sidebar"] [data-testid="community-new-post-button"]');

    this.communityLeadership = page.locator('[data-testid="community-leadership"]');
    this.communityLeadershipHeader = this.communityLeadership.locator('h6');
    this.communityLeadershipList = this.communityLeadership.locator('ul li');
    this.communityDescription = page.locator('[data-testid="community-description"]');
    this.communityDescriptionHeader = this.communityDescription.locator('h6');
    this.communityDescriptionConntent = page.locator('[data-testid="community-description-content"]');
    this.communityRules = page.locator('[data-testid="community-rules"]');
    this.communityRulesHeader = this.communityRules.locator('h6');
    this.communityRulesContent = page.locator('[data-testid="community-rules-content"]');
    this.languageHeader = page.locator('[data-testid="community-language"]').locator('h6')
    this.communityChoosenLanguage = page.locator('[data-testid="community-choosen-language"]')

    this.getFirstPostListItem = page.locator('[data-testid="post-list-item"]').first();
    this.getFirstPostCardAvatar = page.locator('[data-testid="post-card-avatar"]').first();
    this.getFirstPostAuthor = page.locator('[data-testid="post-author"]').first();
    this.getFirstPostAuthorReputation = this.getFirstPostAuthor.locator('..');
    this.getFirstPostCardTimestampLink = page.locator('[data-testid="post-card-timestamp"]').first();
    this.getFirstResponses = page.locator('[data-testid="post-children"]').first()
    this.postCardResponses = page.locator('[data-testid="post-card-responses"]')
    this.communityPinnedPost = page.locator('[data-testid="post-pinned-tag"]');
    this.activityLogButton = this.communityInfoSidebar.getByText('Activity Log');

    this.subscribersNotificationContent = page.locator('[data-testid="notifications-content-all"]');
    this.subscribersNotificationLocalMenu = page.locator('[data-testid="notifications-local-menu"]');
    this.subscriberName = page.locator('[data-testid="subscriber-name"]');
    this.subscriberRow = this.subscribersNotificationContent.locator('tr');
    this.subscribersRowsEven = this.subscribersNotificationContent.locator('[data-testid="notification-list-item"]:nth-of-type(even)');
    this.subscribersRowsOdd =  this.subscribersNotificationContent.locator('[data-testid="notification-list-item"]:nth-of-type(odd)');
    this.subscribersLoadMoreButton = this.subscribersNotificationContent.getByText('Load more');
    this.unmoderatedName = page.getByTestId('community-name-unmoderated');

    // Scoped to the desktop sidebar — the trigger also renders in the mobile
    // `community-simple-description-sidebar`, so an unscoped locator matches
    // two elements. The opened dialog content (fields below) lives in a
    // body-level portal, so those stay page-scoped.
    this.editPropsTrigger = page.locator(
      '[data-testid="community-info-sidebar"] [data-testid="community-edit-props-trigger"]'
    );
    this.editTitleInput = page.getByTestId('community-edit-title');
    this.editAboutInput = page.getByTestId('community-edit-about');
    this.editDescriptionInput = page.getByTestId('community-edit-description');
    this.editFlagTextInput = page.getByTestId('community-edit-flag-text');
    this.editNsfwCheckbox = page.getByTestId('community-edit-nsfw');
    this.editSaveButton = page.getByTestId('community-edit-save');
    this.editCancelButton = page.getByTestId('community-edit-cancel');
    // NSFW badge in the desktop info card. The mobile sidebar renders a
    // duplicate, so scope to community-info-sidebar. Badge text is hardcoded
    // (not i18n), matching the getByText precedent (e.g. activityLogButton).
    this.communityNsfwBadge = this.communityInfoSidebar.getByText('NSFW', { exact: true });
  }

  /**
   * Open the EditCommunityDialog from the sidebar, fill the supplied fields,
   * optionally flip the NSFW checkbox, and submit. Fields left undefined keep
   * their prefilled (recorded) values — the produced `updateProps` broadcast
   * still carries every prop, so callers asserting the full props object must
   * account for the untouched ones.
   */
  async editCommunityProps({
    title,
    about,
    description,
    toggleNsfw
  }: {
    title?: string;
    about?: string;
    description?: string;
    toggleNsfw?: boolean;
  }): Promise<void> {
    await this.editPropsTrigger.click();
    await expect(this.editTitleInput).toBeVisible();
    if (title !== undefined) await this.editTitleInput.fill(title);
    if (about !== undefined) await this.editAboutInput.fill(about);
    if (description !== undefined) await this.editDescriptionInput.fill(description);
    if (toggleNsfw) await this.editNsfwCheckbox.click();
    await this.editSaveButton.click();
  }

  /**
   * The "Pinned" tag in the community feed for a specific post. It renders
   * only when post.stats.is_pinned on a community page (post-list-item.tsx),
   * as an <a data-testid="post-pinned-tag"> whose href ends with the permlink
   * — so scope by permlink to target one post among several pinned ones.
   */
  pinnedTagForPermlink(permlink: string): Locator {
    return this.page.locator(`[data-testid="post-pinned-tag"][href*="${permlink}"]`);
  }

  async validataCommunitiesPageIsLoaded(communityName: string) {
    await expect(this.communityNameTitle).toHaveText(communityName);
    await expect(this.communityInfoSidebar).toBeVisible();
    await expect(this.communityDescriptionSidebar).toBeVisible();
    await expect(this.communityShortDescription).toBeVisible();
    await expect(this.commnnitySubscribers).toBeVisible();

    await expect(this.commnnitySubscribers).toBeVisible();
    await expect(this.communityPendingRewards).toBeVisible();
    if (!this.communitySubscribeButton.isVisible())
      await expect(this.communitySubscribeButtonMobilePage).toBeVisible();
    if (!this.communityNewPostButton.isVisible())
      await expect(this.communityNewPostButtonMobilePage).toBeVisible();
    await expect(this.communityLeadership).toBeVisible();
    await expect(this.communityDescription).toBeVisible();
    if (await this.communityRules.isVisible())
      await expect(this.communityRules).toBeVisible();
  }

  async quickValidataCommunitiesPageIsLoaded(communityName: string) {
    await this.page.waitForTimeout(3000);
    await expect(this.communityNameTitle).toHaveText(communityName);
    await expect(this.communityInfoSidebar).toBeVisible();
    await expect(this.communityDescriptionSidebar).toBeVisible();
    await expect(this.communityLeadership).toBeVisible();
    await expect(this.communityDescription).toBeVisible();
    // await expect(this.communityRules).toBeVisible();  // Not every community has rules
  }
}
