import { Locator, Page, expect } from '@playwright/test';
import { HomePage } from './homePage';

export class PostPage {
  readonly page: Page;
  readonly postListItemOnHomePage: any;
  readonly firstPostImageOnHomePage: Locator;
  readonly firstPostTitleOnHomePage: Locator;

  readonly articleTitle: any;
  readonly articleBody: any;
  readonly articleAuthorData: Locator;
  readonly articleAuthorName: Locator;
  readonly articleFooter: Locator;
  readonly userHoverCard: Locator;
  readonly userHoverCardAvatar: Locator;
  readonly userHoverCardName: Locator;
  readonly userHoverCardNickName: Locator;
  readonly userHoverCardFollowButton: Locator;
  readonly userFollowersHoverCard: Locator;
  readonly userFollowingHoverCard: Locator;
  readonly userHpHoverCard: Locator;
  readonly userAboutHoverCard: Locator;
  readonly buttonFollowHoverCard: Locator;
  readonly buttonMuteHoverCard: Locator;

  readonly commentListItems: Locator;
  readonly commentCardsHeaders: Locator;
  readonly commentCardsHeadersAutorAndReputation: Locator;
  readonly commentCardsHeadersTimeStampLink: Locator;
  readonly commentAuthorLink: Locator;
  readonly commentAuthorReputation: Locator;
  readonly commentCardsTitles: Locator;
  readonly commentCardsDescriptions: Locator;
  readonly commentCardsFooters: Locator;
  readonly commentCardsFooterUpvotes: Locator;
  readonly commentCardsFooterDownvotes: Locator;
  readonly commentCardsFooterPayoutNonZero: Locator;
  readonly commentCardsFooterPayoutZero: Locator;
  readonly commentCardsFooterVotes: Locator;
  readonly commentCardsFooterReply: Locator;
  readonly commentCardsFooterReplyEditor: Locator;
  readonly commentShowButton: Locator;
  readonly reputationValue: Locator;
  readonly commentPageLink: Locator;
  readonly getFirstCommentPageLink: Locator;
  readonly getLoadMoreCommentsLink: Locator;
  readonly getCommentFilter: Locator;
  readonly getCommentFilterList: Locator;
  readonly postImage: Locator;
  readonly footerAuthorName: Locator;
  readonly footerAuthorNameLink: Locator;
  readonly postLabel: Locator;
  readonly postLabelFooter: Locator;
  readonly footerCommunityLink: Locator;
  readonly hoverCardUserAvatar: Locator;
  readonly footerAuthorNameFirst: Locator;
  readonly votesButtons: Locator;
  readonly footerPayouts: Locator;
  readonly footerReblogBtn: Locator;
  readonly reblogDialogHeader: Locator;
  readonly reblogDialogDescription: Locator;
  readonly reblogDialogCancelBtn: Locator;
  readonly reblogDialogOkBtn: Locator;
  readonly reblogDialogCloseBtn: Locator;
  readonly commentReplay: Locator;
  readonly commentResponse: Locator;
  readonly facebookIcon: Locator;
  readonly twitterIcon: Locator;
  readonly linkedinIcon: Locator;
  readonly redditIcon: Locator;
  readonly sharePostBtn: Locator;
  readonly sharePostFrame: Locator;
  readonly hashtagsPosts: Locator;
  readonly postFooterVotes: Locator;
  readonly postsCommentsTab: Locator;
  readonly postsCommentsFirstAvatar: Locator;
  readonly mutedPostsBannedImageText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.postListItemOnHomePage = page.locator('li[data-testid="post-list-item"]');
    this.firstPostImageOnHomePage = page
      .locator('li[data-testid="post-list-item"]:nth-of-type(1) img');
    this.firstPostTitleOnHomePage = page
      .locator('[data-testid="post-list-item"] [data-testid="post-title"] a')
      .first();
    this.articleTitle = page.locator('[data-testid="article-title"]');
    this.articleBody = page.locator('#articleBody');
    this.articleAuthorData = page.locator('[data-testid="author-data"]');
    this.articleAuthorName = this.articleAuthorData.locator('a div');
    this.articleFooter = page.locator('[data-testid="author-data-post-footer"]');
    this.footerAuthorNameLink = this.articleFooter.locator('[data-testid="author-name-link"]');
    this.footerAuthorName = page.locator('[data-testid="author-name-link"]').last();
    this.footerAuthorNameFirst = page.locator('[data-testid="author-name-link"]').first();
    this.userHoverCard = page.locator('[data-testid="user-hover-card-content"]');
    this.userHoverCardAvatar = page.locator('[data-testid="hover-card-user-avatar"]');
    this.userHoverCardName = page.locator('[data-testid="hover-card-user-name"]');
    this.userHoverCardNickName = page.locator('[data-testid="hover-card-user-nickname"]');
    this.userHoverCardFollowButton = page.locator('[data-testid="hover-card-user-follow-button"]');
    this.userFollowersHoverCard = page.locator('[data-testid="user-followers"]');
    this.userFollowingHoverCard = page.locator('[data-testid="user-following"]');
    this.userHpHoverCard = page.locator('[data-testid="user-hp"]');
    this.userAboutHoverCard = page.locator('[data-testid="user-about"]');
    this.buttonFollowHoverCard = page.locator('button').getByText('FOLLOW');
    this.buttonMuteHoverCard = page.locator('button').getByText('Mute');
    this.commentListItems = page.locator('[data-testid="comment-list-item"]');
    this.commentAuthorLink = page.locator('[data-testid="comment-card-header"] [data-testid="author-name-link"]');
    this.commentAuthorReputation = page.locator('[data-testid="comment-card-header"] [data-testid="author-reputation"]');
    this.commentCardsHeaders = page.locator('[data-testid="comment-card-header"]');
    this.commentCardsHeadersAutorAndReputation = this.commentAuthorLink.locator('..'); // Parent of commentAuthorLink
    this.commentCardsHeadersTimeStampLink = page.locator('[data-testid="comment-timestamp-link"]');
    this.commentCardsTitles = page.locator('[data-testid="comment-card-title"]');
    this.commentCardsDescriptions = page.locator('[data-testid="comment-card-description"]');
    this.commentCardsFooters = page.locator('[data-testid="comment-card-footer"]');
    this.commentCardsFooterUpvotes = page.locator('[data-testid="comment-card-footer-upvote"]');
    this.commentCardsFooterDownvotes = page.locator('[data-testid="comment-card-footer-downvote"]');
    this.commentCardsFooterPayoutNonZero = page.locator('[data-testid="comment-card-footer-payout"]');
    this.commentCardsFooterPayoutZero = page.locator('[data-testid="post-payout"]');
    this.commentCardsFooterVotes = this.commentCardsFooters.locator('[data-testid="comment-votes"]');
    this.commentCardsFooterReply = this.commentCardsFooters.locator('[data-testid="comment-card-footer-reply"]');
    this.commentCardsFooterReplyEditor = page.locator('[data-testid="reply-editor"]');
    this.commentShowButton = page.locator('[data-testid="comment-show-button"]');
    this.reputationValue = page.locator('[data-state="closed"]').first();
    this.commentPageLink = page.locator('[data-testid="comment-page-link"]');
    this.getFirstCommentPageLink = this.commentPageLink.first();
    this.getLoadMoreCommentsLink = page.getByText('Load more...');
    this.getCommentFilter = page.locator('[data-testid="posts-filter"]');
    this.getCommentFilterList = page.locator('[data-testid="posts-filter-list"]');
    this.postImage = page.locator('[data-testid="post-image"]')
    this.postLabel = page.locator('div.flex.flex-wrap').locator('.inline-flex.items-center.border.rounded-full').first()
    this.postLabelFooter = page.locator('div.flex.flex-wrap').locator('.inline-flex.items-center.border.rounded-full').last()
    this.footerCommunityLink = page.locator('[data-testid="footer-comment-community-category-link"]')
    this.hoverCardUserAvatar = page.locator("[data-testid='hover-card-user-avatar']")
    this.votesButtons = page.locator('[data-testid="comment-vote-buttons"]')
    this.footerPayouts = page.locator('[data-testid="comment-payout"]')
    this.footerReblogBtn = page.locator('svg.h-4.w-4.cursor-pointer')
    this.reblogDialogHeader = page.locator('[data-testid="reblog-dialog-header"]')
    this.reblogDialogDescription = page.locator('[data-testid="reblog-dialog-description"]')
    this.reblogDialogCancelBtn = page.locator('[data-testid="reblog-dialog-cancel"]')
    this.reblogDialogOkBtn = page.locator('[data-testid="reblog-dialog-ok"]')
    this.reblogDialogCloseBtn = page.locator('[data-testid="reblog-dialog-close"]')
    this.commentReplay = page.locator('[data-testid="comment-reply"]')
    this.commentResponse = page.locator('[data-testid="comment-respons"]')
    this.facebookIcon = page.locator('[title="Share on Facebook"]')
    this.twitterIcon = page.locator('[title="Share on Twitter"]')
    this.linkedinIcon = page.locator('[title="Share on LinkedIn"]')
    this.redditIcon = page.locator('[title="Share on Reddit"]')
    this.sharePostBtn = page.locator('[data-testid="share-post"]')
    this.sharePostFrame = page.locator('[role="dialog"]')
    this.hashtagsPosts = page.locator('[data-testid="hashtags-post"]')
    this.postFooterVotes = page.locator('[data-testid="author-data-post-footer"] [data-testid="comment-votes"]');
    this.postsCommentsTab = page.getByRole('tab', { name: 'Comments' });
    this.postsCommentsFirstAvatar = page.locator('[data-testid="comment-author-avatar"]').first()
    this.mutedPostsBannedImageText = page.locator('#articleBody .text-red-500').first()
  }

  async gotoHomePage() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.postListItemOnHomePage['_selector']);
  }

  async gotoPostPage(communityCategoryName: string, author: string, permlink: string) {
    await this.page.goto(`/${communityCategoryName}/@${author}/${permlink}/`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.articleFooter['_selector']);
  }

  async moveToTheFirstPostInHomePageByImage() {
    const homePage = new HomePage(this.page);
    const firstPostAuthor = (await homePage.getFirstPostAuthor.innerText())
      .trim()
      .replace(' ', '')
      .replace('\n', '');
    // console.log('Author HomePage: ' + firstPostAuthorAndReputation);

    await this.firstPostImageOnHomePage.click();
    await this.page.waitForSelector(this.articleBody['_selector']);

    await expect(this.articleTitle).toBeVisible();
    // console.log('Author: ', await this.articleAuthorName.textContent())
    expect(firstPostAuthor.toString()).toContain(await this.articleAuthorName.textContent());
  }

  async moveToTheFirstPostInHomePageByPostTitle() {
    const homePage = new HomePage(this.page);
    const firstPostAuthor = (await homePage.getFirstPostAuthor.innerText())
      .trim()
      .replace(' ', '')
      .replace('\n', '');
    const firstPostTitleHomePage = await homePage.getFirstPostTitle.textContent();

    await this.firstPostTitleOnHomePage.click();
    await this.page.waitForSelector(this.articleBody['_selector']);

    await expect(this.articleTitle).toBeVisible();
    // expect(await this.articleAuthorName.textContent()).toBe(firstPostAuthorAndReputation);
    expect(firstPostAuthor.toString()).toContain(await this.articleAuthorName.textContent());
    // expect(await this.articleTitle.textContent()).toBe(firstPostTitleHomePage);
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const property = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return property;
  }

  async findPostWithLabel() {

    const postWithLabel = this.page.locator('li[data-testid="post-list-item"]').locator('div.flex.items-center').locator('.inline-flex.items-center.border.rounded-full').first()
    await expect(postWithLabel).toBeVisible()

  }

}
