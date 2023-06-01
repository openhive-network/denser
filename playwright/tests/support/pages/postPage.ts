import { Locator, Page, expect } from '@playwright/test';
import { HomePage } from './homePage';

export class PostPage {
  readonly page: Page;
  readonly postListItemOnHomePage: any;
  readonly firstPostImageOnHomePage: Locator;
  readonly firstPostTitleOnHomePage: Locator;

  readonly articleTitle: Locator;
  readonly articleBody: any;
  readonly articleAuthorData: Locator;
  readonly articleAuthorName: Locator;
  readonly articleFooter: Locator;
  readonly userHoverCard: Locator;
  readonly userFollowersHoverCard: Locator;
  readonly userFollowingHoverCard: Locator;
  readonly userHpHoverCard: Locator;
  readonly userAboutHoverCard: Locator;
  readonly buttonFollowHoverCard: Locator;
  readonly buttonMuteHoverCard: Locator;

  readonly commentListItems: Locator;
  readonly commentCardsHeaders: Locator;
  readonly commentAuthorLink: Locator;
  readonly commentCardsTitles: Locator;
  readonly commentCardsDescriptions: Locator;
  readonly commentCardsFooters: Locator;
  readonly commentShowButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.postListItemOnHomePage = page.locator('li[data-testid="post-list-item"]');
    this.firstPostImageOnHomePage = page
      .locator('[data-testid="post-list-item"] [data-testid="post-image"] img')
      .first();
    this.firstPostTitleOnHomePage = page
      .locator('[data-testid="post-list-item"] [data-testid="post-title"] a')
      .first();
    this.articleTitle = page.locator('[data-testid="article-title"]');
    this.articleBody = page.locator('#articleBody');
    this.articleAuthorData = page.locator('[data-testid="author-data"]');
    this.articleAuthorName = this.articleAuthorData.locator('a div');
    this.articleFooter = page.locator('[data-testid="author-data-post-footer"]');
    this.userHoverCard = page.locator('[data-testid="user-hover-card-content"]');
    this.userFollowersHoverCard = page.locator('[data-testid="user-followers"]');
    this.userFollowingHoverCard = page.locator('[data-testid="user-following"]');
    this.userHpHoverCard = page.locator('[data-testid="user-hp"]');
    this.userAboutHoverCard = page.locator('[data-testid="user-about"]');
    this.buttonFollowHoverCard = page.locator('button').getByText('Follow');
    this.buttonMuteHoverCard = page.locator('button').getByText('Mute');
    this.commentListItems = page.locator('[data-testid="comment-list-item"]');
    this.commentAuthorLink = page.locator('[data-testid="comment-author-link"]');
    this.commentCardsHeaders = page.locator('[data-testid="comment-card-header"]');
    this.commentCardsTitles = page.locator('[data-testid="comment-card-title"]');
    this.commentCardsDescriptions = page.locator('[data-testid="comment-card-description"]');
    this.commentCardsFooters = page.locator('[data-testid="comment-card-footer"]');
    this.commentShowButton = page.locator('[data-testid="comment-show-button"]');
  }

  async gotoHomePage() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.postListItemOnHomePage['_selector']);
  }

  async moveToTheFirstPostInHomePageByImage() {
    const homePage = new HomePage(this.page);
    const firstPostAuthorAndReputation = (await homePage.getFirstPostAuthorReputation.innerText())
      .trim()
      .replace(' ', '')
      .replace('@', '');
    // console.log('Author HomePage: ' + firstPostAuthorAndReputation);

    await this.firstPostImageOnHomePage.click();
    await this.page.waitForSelector(this.articleBody['_selector']);

    await expect(this.articleTitle).toBeVisible();
    // console.log('Author: ', await this.articleAuthorName.textContent())
    expect(await this.articleAuthorName.textContent()).toBe(firstPostAuthorAndReputation);
  }

  async moveToTheFirstPostInHomePageByPostTitle() {
    const homePage = new HomePage(this.page);
    const firstPostAuthorAndReputation = (await homePage.getFirstPostAuthorReputation.innerText())
      .trim()
      .replace(' ', '')
      .replace('@', '');
    const firstPostTitleHomePage = await homePage.getFirstPostTitle.textContent();

    await this.firstPostTitleOnHomePage.click();
    await this.page.waitForSelector(this.articleBody['_selector']);

    await expect(this.articleTitle).toBeVisible();
    expect(await this.articleAuthorName.textContent()).toBe(firstPostAuthorAndReputation);
    expect(await this.articleTitle.textContent()).toBe(firstPostTitleHomePage);
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const property = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return property;
  }
}
