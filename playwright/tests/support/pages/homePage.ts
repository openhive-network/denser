import { Locator, Page, expect } from '@playwright/test';
import { PostPage } from './postPage';
// @ts-ignore
import env from '@beam-australia/react-env';
import { ProfilePage } from './profilePage';
export class HomePage {
  readonly page: Page;
  readonly postPage: PostPage;
  readonly getTrendingCommunitiesSideBar: Locator;
  readonly getTrendingCommunitiesSideBarLinks: Locator;
  readonly getTrandingCommunitiesHeader: Locator;
  readonly getExploreCommunities: Locator;
  readonly getLeoFinanceCommunitiesLink: Locator;
  readonly getHeaderLeoCommunities: Locator;
  readonly getPinmappleCommunitiesLink: Locator;
  readonly getHeaderPinmappleCommunities: Locator;
  readonly getHomeNavLink: Locator;
  readonly getNavPostsLink: Locator;
  readonly getNavProposalsLink: Locator;
  readonly getNavWitnessesLink: Locator;
  readonly getNavOurdAppsLink: Locator;
  readonly getNavSearchInput: Locator;
  readonly getNavUserAvatar: Locator;
  readonly getNavCreatePost: Locator;
  readonly getNavSidebarMenu: any;
  readonly getNavProfileMenuContent: any;
  readonly getNavSidebarMenuContent: Locator;
  readonly getNavSidebarMenuContentCloseButton: Locator;
  readonly getHeaderAllCommunities: Locator;
  readonly getMainTimeLineOfPosts: any;
  readonly getPostCardAvatar: Locator;
  readonly getPostCardFooter: Locator;
  readonly getUpvoteButton: Locator;
  readonly getFirstPostUpvoteButton: Locator;
  readonly getUpvoteButtonTooltip: Locator;
  readonly getDownvoteButton: Locator;
  readonly getFirstPostDownvoteButton: Locator;
  readonly getDownvoteButtonTooltip: Locator;
  readonly getFirstPostDownvoteButtonTooltip: Locator;
  readonly getFirstPostUpvoteButtonTooltip: Locator;
  readonly getFirstPostCardFooter: Locator;
  readonly getFirstPostListItem: Locator;
  readonly getFirstPostCardAvatar: Locator;
  readonly getFirstPostAuthor: Locator;
  readonly getFirstPostAuthorReputation: Locator;
  readonly getFirstPostCardCommunityLink: Locator;
  readonly getFirstPostCardCategoryLink: Locator;
  readonly getFirstPostCardTimestampLink: Locator;
  readonly getFirstPostTitle: Locator;
  readonly getFirstPostPayout: Locator;
  readonly getFirstPostPayoutTooltip: Locator;
  readonly getFirstPostVotes: Locator;
  readonly getFirstPostVotesTooltip: Locator;
  readonly getFirstPostChildren: Locator;
  readonly getPostChildren: Locator;
  readonly getBody: Locator;
  readonly getThemeModeButton: Locator;
  readonly getThemeModeItem: Locator;
  readonly getFilterPosts: Locator;
  readonly getFilterPostsList: Locator;
  readonly getCardExploreHive: Locator;
  readonly getCardExploreHiveTitle: Locator;
  readonly getCardExploreHiveLinks: Locator;
  readonly getCardUserShortcuts: Locator;
  readonly getCardUserShortcutsTitle: Locator;
  readonly getCardUserShortcutsLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.postPage = new PostPage(page);
    this.getTrendingCommunitiesSideBar = page.locator('[data-testid="card-trending-comunities"]');
    this.getTrendingCommunitiesSideBarLinks = this.getTrendingCommunitiesSideBar.locator('div ul li a');
    this.getTrandingCommunitiesHeader = this.getTrendingCommunitiesSideBar.locator('a').getByText('All posts');
    this.getExploreCommunities = page.getByText('Explore communities...');
    this.getLeoFinanceCommunitiesLink = this.getTrendingCommunitiesSideBar
      .locator('a')
      .getByText('LeoFinance');
    this.getHeaderLeoCommunities = page.locator(
      '[class="mt-4 flex items-center justify-between"] span:text("LeoFinance")'
    );
    this.getPinmappleCommunitiesLink = this.getTrendingCommunitiesSideBar.locator('a:text("Pinmapple")');
    this.getHeaderPinmappleCommunities = page.locator(
      '[class="mt-4 flex items-center justify-between"] span:text("Pinmapple")'
    );
    this.getHomeNavLink = page.locator('header a span:text("Hive Blog")');
    this.getNavPostsLink = page.locator('[data-testid="nav-posts-link"]');
    this.getNavProposalsLink = page.locator('[data-testid="nav-proposals-link"]');
    this.getNavWitnessesLink = page.locator('[data-testid="nav-witnesses-link"]');
    this.getNavOurdAppsLink = page.locator('[data-testid="nav-our-dapps-link"]');
    this.getHeaderAllCommunities = page.locator(
      '[class="mt-4 flex items-center justify-between"] span:text("All posts")'
    );
    this.getMainTimeLineOfPosts = page.locator('li[data-testid="post-list-item"]');
    this.getFirstPostListItem = this.getMainTimeLineOfPosts.first().locator('div').first();
    this.getPostCardAvatar = page.locator('[data-testid="post-card-avatar"]');
    this.getFirstPostCardAvatar = this.getPostCardAvatar.first();
    this.getFirstPostAuthor = page.locator('[data-testid="post-author"]').first();
    this.getFirstPostAuthorReputation = this.getFirstPostAuthor.locator('..');
    this.getFirstPostCardCommunityLink = page.locator('[data-testid="post-card-community"]').first();
    this.getFirstPostCardCategoryLink = page.locator('[data-testid="post-card-category"]').first();
    this.getFirstPostCardTimestampLink = page.locator('[data-testid="post-card-timestamp"]').first();
    this.getFirstPostTitle = page.locator('li[data-testid="post-list-item"] h3 a').first();
    this.getFirstPostPayout = page.locator('[data-testid="post-payout"]').first();
    this.getFirstPostPayoutTooltip = page.locator('[data-testid="payout-post-card-tooltip"]').first();
    this.getFirstPostVotes = page.locator('[data-testid="post-total-votes"]').first();
    this.getFirstPostVotesTooltip = page.locator('[data-testid="post-card-votes-tooltip"]').first();
    this.getFirstPostChildren = page.locator('[data-testid="post-children"]').first();
    this.getPostChildren = page.locator('[data-testid="post-children"]');
    this.getPostCardFooter = page.locator('[data-testid="post-card-footer"]');
    this.getUpvoteButton = page.locator('[data-testid="upvote-button"]');
    this.getFirstPostUpvoteButton = this.getUpvoteButton.first();
    this.getFirstPostCardFooter = this.getPostCardFooter.first();
    this.getUpvoteButtonTooltip = page.locator('[data-testid="upvote-button-tooltip"]');
    this.getFirstPostUpvoteButtonTooltip = this.getUpvoteButtonTooltip.first();
    this.getDownvoteButton = page.locator('[data-testid="downvote-button"]');
    this.getFirstPostDownvoteButton = this.getDownvoteButton.first();
    this.getDownvoteButtonTooltip = page.locator('[data-testid="downvote-button-tooltip"]');
    this.getFirstPostDownvoteButtonTooltip = this.getDownvoteButtonTooltip.first();
    this.getBody = page.locator('body');
    this.getThemeModeButton = page.locator('[data-testid="theme-mode"]');
    this.getThemeModeItem = page.locator('[data-testid="theme-mode-item"]');
    this.getFilterPosts = page.locator('[data-testid="posts-filter"]');
    this.getFilterPostsList = page.locator('[data-testid="posts-filter-list"]');
    this.getCardExploreHive = page.locator('[data-testid="card-explore-hive-desktop"]');
    this.getCardExploreHiveTitle = this.getCardExploreHive.locator('div h3');
    this.getCardExploreHiveLinks = this.getCardExploreHive.locator('div ul li');
    this.getCardUserShortcuts = page.locator('[data-testid="card-user-shortcuts"]');
    this.getCardUserShortcutsTitle = this.getCardUserShortcuts.locator('div h3');
    this.getCardUserShortcutsLinks = this.getCardUserShortcuts.locator('div ul li');
    this.getNavSearchInput = page.locator('header div nav input[type="search"]');
    this.getNavUserAvatar = page.locator('[data-testid="profile-menu"]');
    this.getNavProfileMenuContent = page.locator('[data-testid="profile-menu-content"]');
    this.getNavCreatePost = page.locator('[data-testid="nav-pencil"]');
    this.getNavSidebarMenu = page.locator('[data-testid="nav-sidebar-menu-button"]');
    this.getNavSidebarMenuContent = page.locator('[data-testid="nav-sidebar-menu-content"]');
    this.getNavSidebarMenuContentCloseButton = this.getNavSidebarMenuContent.locator('button');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.getMainTimeLineOfPosts['_selector']);
  }

  async moveToHomePage() {
    await this.getHomeNavLink.click();
    await expect(this.getHeaderAllCommunities).toBeVisible();
  }

  async moveToLeoFinanceCommunities() {
    await this.getLeoFinanceCommunitiesLink.click();
    await expect(this.getHeaderLeoCommunities).toBeVisible();
  }

  async moveToPinmappleCommunities() {
    await this.getPinmappleCommunitiesLink.click();
    await expect(this.getHeaderPinmappleCommunities).toBeVisible();
  }

  async moveToExploreCommunities() {
    await this.getExploreCommunities.click();
  }

  async moveToFirstPostAuthorProfilePage() {
    const profilePage = new ProfilePage(this.page);
    const firstPostAuthorNick = await this.getFirstPostAuthor.innerText();
    // Click the post's author name link
    await this.getFirstPostAuthor.click();

    // Validate that you moved to the clicked post author profile page
    await this.page.waitForSelector(profilePage.profileName['_selector']);
    expect(await profilePage.profileName).toBeVisible();
    await profilePage.profilePostsLink.click();
    await this.page.waitForSelector(profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']);
    const firstPostAuthorNameProfilePage = await this.page.locator('[data-testid="post-author"]').first();
    await expect('@' + firstPostAuthorNick).toMatch(await firstPostAuthorNameProfilePage.innerText());
  }

  async moveToFirstPostAuthorProfilePageByAvatar() {
    const profilePage = new ProfilePage(this.page);
    const firstPostAuthorNick = await this.getFirstPostAuthor.innerText();
    // Click the post's author avatar link
    await this.getFirstPostCardAvatar.click();

    // Validate that you moved to the clicked post author profile page
    await this.page.waitForSelector(profilePage.profileName['_selector']);
    expect(await profilePage.profileName).toBeVisible();
    await profilePage.profilePostsLink.click();
    await this.page.waitForSelector(profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']);
    const firstPostAuthorNameProfilePage = await this.page.locator('[data-testid="post-author"]').first();
    await expect('@' + firstPostAuthorNick).toMatch(await firstPostAuthorNameProfilePage.innerText());
  }

  async moveToFirstPostCommunityOrCategory() {
    const profilePage = new ProfilePage(this.page);
    const firstPostAuthorNick = await this.getFirstPostAuthor.innerText();

    const firstPostCardCommunityLink = await this.getFirstPostCardCommunityLink;
    const firstPostCardCategoryLink = await this.getFirstPostCardCategoryLink;
    const firstPostCardCommunityLinkText = await this.getFirstPostCardCommunityLink.textContent();
    const firstPostCardCategoryLinkText = await this.getFirstPostCardCategoryLink.textContent();

    if (await firstPostCardCommunityLink.isVisible()) {
      firstPostCardCommunityLink.click();
      await this.page.waitForSelector(
        this.page.locator('[data-testid="short-community-description"]')['_selector']
      );
      expect(await this.page.locator('[data-testid="community-name"]').textContent()).toBe(
        await firstPostCardCommunityLinkText
      );
      await expect(await this.page.locator('[data-testid="community-name-unmoderated"]').textContent()).toBe(
        'Community'
      );
    } else if (await firstPostCardCategoryLink.isVisible()) {
      firstPostCardCategoryLink.click();
      await this.page.waitForSelector(
        this.page.locator('[data-testid="short-community-description"]')['_selector']
      );
      expect(await this.page.locator('[data-testid="community-name"]').textContent()).toBe(
        await firstPostCardCategoryLinkText
      );
      expect(await this.page.locator('[data-testid="community-name-unmoderated"]').textContent()).toBe(
        'Unmoderated tag'
      );
    }
  }

  async moveToFirstPostContentByClickingTimestamp() {
    const profilePage = new ProfilePage(this.page);
    const firstPostCardTitle = await this.getFirstPostTitle.textContent();
    // Click the post's timestamp link
    await this.getFirstPostCardTimestampLink.click();
    await this.page.waitForSelector(this.page.locator('[data-testid="article-title"]')['_selector']);
    expect(await this.page.locator('[data-testid="article-title"]').textContent()).toBe(firstPostCardTitle);
  }

  async moveToTheFirstPostWithCommentsNumberMoreThanZero() {
    // Find first post with comments go inside
    const postsCard = await this.getMainTimeLineOfPosts.all();
    const postsComments = await this.getPostChildren.all();

    let numberOfCommentsInPost: Locator;
    let postTitle: Locator;
    let postTitleText: any;

    for (let postIndex = 0; postIndex < postsComments.length; postIndex++) {
      numberOfCommentsInPost = postsComments[postIndex];
      postTitle = postsCard[postIndex].locator('[data-testid="post-title"] a');

      console.log('Number comments of a post: ', await numberOfCommentsInPost.textContent());
      console.log('Post Title:  ', await postTitle.textContent());

      if ((await numberOfCommentsInPost.textContent()) !== '0') {
        postTitleText = await postTitle.textContent();

        await postTitle.click();
        await expect(this.postPage.articleTitle).toBeVisible();
        expect(await this.postPage.articleTitle.textContent()).toBe(postTitleText);

        break;
      }
    }
  }

  async moveToNavPostsPage() {
    const url = env('API_ENDPOINT');
    await this.getNavPostsLink.click();
    await expect(this.page.url()).toBe(`https://${url}/trending`);
  }

  async moveToNavProposalsPage() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.getNavProposalsLink.click();
    const newPage = await pagePromise;
    // await this.page.waitForSelector(this.page.locator('[data-testid="proposals-body"]')['_selector']);
    await expect(newPage.url().includes(`/proposals`)).toBeTruthy();
  }

  async moveToNavWitnessesPage() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.getNavWitnessesLink.click();
    const newPage = await pagePromise;
    // await this.page.waitForSelector(this.page.locator('[data-testid="witness-table-body"]')['_selector']);
    await expect(newPage.url().includes(`/~witnesses`)).toBeTruthy();
  }

  async moveToNavOurdAppsPage() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.getNavOurdAppsLink.click();
    const newPage = await pagePromise;
    await expect(newPage.url()).toBe(`https://hive.io/eco/`);
  }

  async isTrendingCommunitiesVisible() {
    await expect(this.getTrandingCommunitiesHeader).toBeVisible();
    await expect(this.getExploreCommunities).toHaveText(/Explore communities.../);
    await expect(this.getExploreCommunities).toBeEnabled();
  }

  async mainPostsTimelineVisible(amountOfPosts: number) {
    // Validate that there are 20 posts displayed on HomePage as default (without scrolldown)
    await expect(this.getMainTimeLineOfPosts).toHaveCount(amountOfPosts);
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const bcg = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return bcg;
  }

  // Theme mode: Light, Dark, System
  async changeThemeMode(thememode: string) {
    await this.getThemeModeButton.click();
    await this.getThemeModeItem.locator(`span:text(\"${thememode}\")`).click();
  }

  async validateThemeModeIsLight() {
    expect(await this.getElementCssPropertyValue(this.getBody, 'background-color')).toBe(
      'rgb(255, 255, 255)'
    );
  }

  async validateThemeModeIsSystem() {
    expect(await this.getElementCssPropertyValue(this.getBody, 'background-color')).toBe(
      'rgb(255, 255, 255)'
    );
  }

  async validateThemeModeIsDark() {
    expect(await this.getElementCssPropertyValue(this.getBody, 'background-color')).toBe('rgb(3, 7, 17)');
  }
}
