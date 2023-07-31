import { Locator, Page, expect } from '@playwright/test';

export class CommunitiesPage {
  readonly page: Page;
  readonly communityNameTitle: Locator;
  readonly communityInfoSidebar: Locator;
  readonly communityDescriptionSidebar: Locator;
  readonly communityShortDescription: Locator;
  readonly commnnitySubscribers: Locator;
  readonly communityPendingRewards: Locator;
  readonly communityActivePosters: Locator;
  readonly communitySubscribeButton: Locator;
  readonly communityNewPostButton: Locator;
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


  constructor(page: Page) {
    this.page = page;
    this.communityNameTitle = page.locator('[data-testid="community-name"]');
    this.communityInfoSidebar = page.locator('[data-testid="community-info-sidebar"]');
    this.communityDescriptionSidebar = page.locator('[data-testid="community-description-rules-sidebar"]');
    this.communityShortDescription = page.locator('[data-testid="short-community-description"]');
    this.commnnitySubscribers = page.locator('[data-testid="community-subscribers"]');
    this.communityPendingRewards = page.locator('[data-testid="community-pending-rewards"]');
    this.communityActivePosters = page.locator('[data-testid="community-active-posters"]');
    this.communitySubscribeButton = page.locator('[data-testid="community-subscribe-button"]');
    this.communityNewPostButton = page.locator('[data-testid="community-new-post-button"]');
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
  }

  async validataCommunitiesPageIsLoaded(communityName: string) {
    await expect(this.communityNameTitle).toHaveText(communityName);
    await expect(this.communityInfoSidebar).toBeVisible();
    await expect(this.communityDescriptionSidebar).toBeVisible();
    await expect(this.communityShortDescription).toBeVisible();
    await expect(this.commnnitySubscribers).toBeVisible();

    await expect(this.commnnitySubscribers).toBeVisible();
    await expect(this.communityPendingRewards).toBeVisible();
    await expect(this.communitySubscribeButton).toBeVisible();
    await expect(this.communityNewPostButton).toBeVisible();
    await expect(this.communityLeadership).toBeVisible();
    await expect(this.communityDescription).toBeVisible();
    await expect(this.communityRules).toBeVisible();
  }

  async quickValidataCommunitiesPageIsLoaded(communityName: string) {
    await expect(this.communityNameTitle).toHaveText(communityName);
    await expect(this.communityInfoSidebar).toBeVisible();
    await expect(this.communityDescriptionSidebar).toBeVisible();
    await expect(this.communityLeadership).toBeVisible();
    await expect(this.communityDescription).toBeVisible();
    await expect(this.communityRules).toBeVisible();
  }
}
