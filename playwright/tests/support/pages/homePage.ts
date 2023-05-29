import { Locator, Page, expect } from '@playwright/test';
import { PostPage } from './postPage';
import env from '@beam-australia/react-env';

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
  readonly getFirstPostAuthor: Locator;
  readonly getFirstPostAuthorReputation: Locator;
  readonly getFirstPostTitle: Locator;
  readonly getFirstPostPayout: Locator;
  readonly getFirstPostVotes: Locator;
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
    this.getTrandingCommunitiesHeader = page.getByText('Trending Communities');
    this.getExploreCommunities = page.getByText('Explore communities...');
    this.getLeoFinanceCommunitiesLink = page.locator('a').getByRole('button', { name: 'LeoFinance' });
    this.getHeaderLeoCommunities = page.locator(
      '[class="mt-4 flex items-center justify-between"] span:text("LeoFinance")'
    );
    this.getPinmappleCommunitiesLink = page.locator('a > button:text("Pinmapple")');
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
    this.getFirstPostAuthor = page.locator('[data-testid="post-author"]').first();
    this.getFirstPostAuthorReputation = this.getFirstPostAuthor.locator('..');
    this.getFirstPostTitle = page.locator('li[data-testid="post-list-item"] h3 a').first();
    this.getFirstPostPayout = page.locator('[data-testid="post-payout"]').first();
    this.getFirstPostVotes = page.locator('[data-testid="post-total-votes"]').first();
    this.getFirstPostChildren = page.locator('[data-testid="post-children"]').first();
    this.getPostChildren = page.locator('[data-testid="post-children"]');
    this.getBody = page.locator('body');
    this.getThemeModeButton = page.locator('[data-testid="theme-mode"]');
    this.getThemeModeItem = page.locator('[data-testid="theme-mode-item"]');
    this.getFilterPosts = page.locator('[data-testid="posts-filter"]');
    this.getFilterPostsList = page.locator('[data-testid="posts-filter-list"]');
    this.getCardExploreHive = page.locator('[data-testid="card-explore-hive"]');
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
    const firstPostAuthorNick = await this.getFirstPostAuthor.innerText();
    await this.getFirstPostAuthor.click();

    // Validate that you moved to the clicked post author profile page
    const postAuthorNickOnProfilePage = await this.page.locator('[data-testid="profile-nickname"]');
    await expect(firstPostAuthorNick).toMatch(await postAuthorNickOnProfilePage.innerText());
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
    await this.getNavProposalsLink.click();
    await expect(this.page.url()).toBe(`https://wallet.hive.blog/proposals`);
  }

  async moveToNavWitnessesPage() {
    await this.getNavWitnessesLink.click();
    await expect(this.page.url()).toBe(`http://denser:3000/~witnesses`);
  }

  async moveToNavOurdAppsPage() {
    await this.getNavOurdAppsLink.click();
    await expect(this.page.url()).toBe(`https://hive.io/eco/`);
  }

  async isTrendingCommunitiesVisible() {
    await expect(this.getTrandingCommunitiesHeader).toBeVisible();
    await expect(this.getExploreCommunities).toHaveText(/Explore communities.../);
    await expect(this.getExploreCommunities).toBeEnabled();
  }

  async mainPostsTimelineVisible() {
    // Validate that there are 20 posts displayed on HomePage as default (without scrolldown)
    await expect(this.getMainTimeLineOfPosts).toHaveCount(20);
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
