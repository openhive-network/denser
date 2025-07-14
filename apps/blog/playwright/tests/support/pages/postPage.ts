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
  readonly userPopoverCard: Locator;
  readonly userPopoverCardAvatar: Locator;
  readonly userPopoverCardName: Locator;
  readonly userPopoverCardNickName: Locator;
  readonly userPopoverCardFollowButton: Locator;
  readonly userFollowersPopoverCard: Locator;
  readonly userFollowingPopoverCard: Locator;
  readonly userHpPopoverCard: Locator;
  readonly userAboutPopoverCard: Locator;
  readonly buttonFollowPopoverCard: Locator;
  readonly buttonMutePopoverCard: Locator;

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
  readonly commentCardsFooterEditButton: Locator;
  readonly firstNestedCommentEditButton: Locator;
  readonly commentShowButton: Locator;
  readonly postVoterList: Locator;
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
  readonly popoverCardUserAvatar: Locator;
  readonly footerAuthorNameFirst: Locator;
  readonly upvoteButton: Locator;
  readonly downvoteButton: Locator;
  readonly footerPayouts: Locator;
  readonly footerPayoutsTooltip: Locator;
  readonly footerReblogBtn: Locator;
  readonly footerReblogBtnCardList: Locator;
  readonly reblogDialogHeader: Locator;
  readonly reblogDialogDescription: Locator;
  readonly reblogDialogCancelBtn: Locator;
  readonly reblogDialogOkBtn: Locator;
  readonly reblogDialogCloseBtn: Locator;
  readonly commentReplay: Locator;
  readonly commentResponse: Locator;
  readonly postResponseTooltip: Locator;
  readonly facebookIcon: Locator;
  readonly twitterIcon: Locator;
  readonly linkedinIcon: Locator;
  readonly redditIcon: Locator;
  readonly sharePostBtn: Locator;
  readonly sharePostFrame: Locator;
  readonly sharePostCloseBtn: Locator;
  readonly hashtagsPosts: Locator;
  readonly postFooterVotes: Locator;
  readonly postsCommentsTab: Locator;
  readonly postsCommentsFirstAvatar: Locator;
  readonly mutedPostsBannedImageText: Locator;
  readonly userPostMenu: Locator;
  readonly postFooterUpvoteButton: Locator;
  readonly postFooterUpvoteTooltip: Locator;
  readonly postFooterDownvoteButton: Locator;
  readonly postFooterDownvoteTooltip: Locator;
  readonly firstPostAffiliationTag: Locator;
  readonly showPostBodyBtn: Locator;
  readonly articleBodyString: string;
  readonly articleAuthor: string;
  readonly userPopoverCardContent: string;
  readonly profileFollowBtn: string;
  readonly commentCard: string;
  readonly commentListItem: string;
  readonly articleBodyParagraph: string;
  readonly postingToDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.showPostBodyBtn = page.getByRole('button', { name: 'Show' });
    this.postListItemOnHomePage = page.locator('li[data-testid="post-list-item"]');
    this.firstPostImageOnHomePage = page.locator('li[data-testid="post-list-item"]:nth-of-type(1) img');
    this.firstPostTitleOnHomePage = page
      .locator('[data-testid="post-list-item"] [data-testid="post-title"] a')
      .first();
    this.articleTitle = page.locator('[data-testid="article-title"]');
    this.articleBody = page.locator('#articleBody').first();
    this.articleBodyString = '#articleBody';
    this.articleBodyParagraph = '#articleBody > p';
    this.articleAuthorData = page.locator('[data-testid="author-data"]');
    this.articleAuthor = '[data-testid="author-name-link"]'
    this.articleAuthorName = this.articleAuthorData
      .locator('[data-testid="author-name-link"]')
      .locator('span')
      .nth(1);
    this.articleFooter = page.locator('[data-testid="author-data-post-footer"]');
    this.profileFollowBtn = '[data-testid="profile-follow-button"]';
    this.footerAuthorNameLink = this.articleFooter.locator('[data-testid="author-name-link"]');
    this.footerAuthorName = page.locator('[data-testid="author-name-link"]').last();
    this.footerAuthorNameFirst = page.locator('[data-testid="author-name-link"]').first();
    this.userPopoverCard = page.locator('[data-testid="user-popover-card-content"]');
    this.userPopoverCardContent = '[data-testid="user-popover-card-content"]';
    this.userPopoverCardAvatar = page.locator('[data-testid="popover-card-user-avatar"]');
    this.userPopoverCardName = page.locator('[data-testid="popover-card-user-name"]');
    this.userPopoverCardNickName = page.locator('[data-testid="popover-card-user-nickname"]');
    this.userPopoverCardFollowButton = page.locator('[data-testid="popover-card-user-follow-button"]');
    this.userFollowersPopoverCard = page.locator('[data-testid="user-followers"]');
    this.userFollowingPopoverCard = page.locator('[data-testid="user-following"]');
    this.userHpPopoverCard = page.locator('[data-testid="user-hp"]');
    this.userAboutPopoverCard = page.locator('[data-testid="user-about"]');
    this.buttonFollowPopoverCard = page.getByTestId('user-popover-card-content').locator('button').getByText('Follow');
    this.buttonMutePopoverCard = page.locator('button').getByText('Mute');
    this.commentListItems = page.locator('[data-testid="comment-list-item"]');
    this.commentListItem = '[data-testid="comment-list-item"]'
    this.commentAuthorLink = page.locator(
      '[data-testid="comment-card-header"] [data-testid="author-name-link"]'
    );
    this.commentAuthorReputation = page.locator(
      '[data-testid="comment-card-header"] [data-testid="author-reputation"]'
    );
    this.commentCardsHeaders = page.locator('[data-testid="comment-card-header"]');
    this.commentCardsHeadersAutorAndReputation = this.commentAuthorLink.locator('..'); // Parent of commentAuthorLink
    this.commentCardsHeadersTimeStampLink = page.locator('[data-testid="comment-timestamp-link"]');
    this.commentCardsTitles = page.locator('[data-testid="comment-card-title"]');
    this.commentCardsDescriptions = page.locator('[data-testid="comment-card-description"]');
    this.commentCard = '[data-testid="comment-card-description"]';
    this.commentCardsFooters = page.locator('[data-testid="comment-card-footer"]');
    this.commentCardsFooterUpvotes = this.commentCardsFooters.locator('[data-testid="upvote-button"]');
    this.commentCardsFooterDownvotes = this.commentCardsFooters.locator('[data-testid="downvote-button"]');
    this.commentCardsFooterPayoutNonZero = page.locator('[data-testid="comment-card-footer-payout"]');
    this.commentCardsFooterPayoutZero = page.locator('[data-testid="post-payout"]');
    this.commentCardsFooterVotes = this.commentCardsFooters.locator('[data-testid="comment-votes"]');
    this.postVoterList = page.locator('[data-testid="list-of-voters"]');
    this.commentCardsFooterReply = this.commentCardsFooters.locator(
      '[data-testid="comment-card-footer-reply"]'
    );
    this.commentCardsFooterReplyEditor = page.locator('[data-testid="reply-editor"]');
    this.commentCardsFooterEditButton = page.getByTestId('comment-card-footer-edit');
    this.firstNestedCommentEditButton = page.locator('ul ul').first().getByTestId('comment-card-footer-edit').first();
    this.commentShowButton = page.locator('[data-testid="comment-show-button"]');
    this.reputationValue = page.locator('[data-testid="post-author-reputation"]').first();
    this.commentPageLink = page.locator('[data-testid="comment-page-link"]');
    this.getFirstCommentPageLink = this.commentPageLink.first();
    this.getLoadMoreCommentsLink = page.getByText('Load more...');
    this.getCommentFilter = page.locator('[data-testid="posts-filter"]');
    this.getCommentFilterList = page.locator('[data-testid="posts-filter-list"]');
    this.postImage = page.locator('[data-testid="post-image"]');
    this.postLabel = page
      .locator('div.flex.flex-wrap')
      .locator('.inline-flex.items-center.border.rounded-full')
      .first();
    this.postLabelFooter = page
      .locator('div.flex.flex-wrap')
      .locator('.inline-flex.items-center.border.rounded-full')
      .last();
    this.footerCommunityLink = page.locator('[data-testid="footer-comment-community-category-link"]');
    this.popoverCardUserAvatar = page.locator("[data-testid='popover-card-user-avatar']");
    this.upvoteButton = this.articleFooter.locator('[data-testid="upvote-button"]');
    this.downvoteButton = this.articleFooter.locator('[data-testid="downvote-button"]');
    this.footerPayouts = page.locator('[data-testid="comment-payout"]');
    this.footerPayoutsTooltip = page.locator('[data-testid="payout-post-card-tooltip"]');
    this.footerReblogBtn = page.locator('[data-testid="comment-respons-header"] svg.h-4.w-4.cursor-pointer');
    this.footerReblogBtnCardList = page.locator('[data-testid="post-footer-reblog-tooltip"]');
    this.reblogDialogHeader = page.locator('[data-testid="reblog-dialog-header"]');
    this.reblogDialogDescription = page.locator('[data-testid="reblog-dialog-description"]');
    this.reblogDialogCancelBtn = page.locator('[data-testid="reblog-dialog-cancel"]');
    this.reblogDialogOkBtn = page.locator('[data-testid="reblog-dialog-ok"]');
    this.reblogDialogCloseBtn = page.locator('[data-testid="reblog-dialog-close"]');
    this.commentReplay = page.locator('[data-testid="comment-reply"]');
    this.commentResponse = page.locator('[data-testid="comment-respons"]');
    this.postResponseTooltip = page.locator('[data-testid="post-footer-response-tooltip"]');
    this.facebookIcon = page.locator('[data-testid="share-on-facebook"]'); // page.locator('[title="Share on Facebook"]')
    this.twitterIcon = page.locator('[data-testid="share-on-twitter"]'); // page.locator('[title="Share on Twitter"]')
    this.linkedinIcon = page.locator('[data-testid="share-on-linkedin"]'); // page.locator('[title="Share on LinkedIn"]')
    this.redditIcon = page.locator('[data-testid="share-on-reddit"]'); // page.locator('[title="Share on Reddit"]')
    this.sharePostBtn = page.locator('[data-testid="share-post"]');
    this.sharePostFrame = page.locator('[role="dialog"]');
    this.sharePostCloseBtn = page.locator('[data-testid="close-dialog"]');
    this.hashtagsPosts = page.locator('[data-testid="hashtags-post"]');
    this.postFooterVotes = page.locator(
      '[data-testid="author-data-post-footer"] [data-testid="comment-votes"]'
    );
    this.postsCommentsTab = page.getByRole('tab', { name: 'Comments' });
    this.postsCommentsFirstAvatar = page.locator('[data-testid="comment-author-avatar"]').first();
    this.mutedPostsBannedImageText = page.locator('#articleBody .text-red-500').first();
    this.userPostMenu = page.getByTestId('user-post-menu');
    this.postFooterUpvoteTooltip = page.locator('[data-testid="upvote-button-tooltip"]');
    this.postFooterDownvoteTooltip = page.locator('[data-testid="downvote-button-tooltip"]');
    this.firstPostAffiliationTag = page.locator('[data-testid="affiliation-tag-badge"]').first();
    this.postingToDropdown = page.locator('[data-testid="posting-to-list-trigger"]');
  }

  async gotoHomePage() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.postListItemOnHomePage['_selector']);
  }

  async gotoPostPage(communityCategoryName: string, author: string, permlink: string) {
    await this.page.goto(`/${communityCategoryName}/@${author}/${permlink}/`);
    await this.page.waitForLoadState('domcontentloaded');
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

    if (await this.firstPostAffiliationTag.innerText.toString() == "nsfw") {
      await this.page.getByText('Reveal this post').first().click();
    }
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
    const postWithLabel = this.page
      .locator('li[data-testid="post-list-item"]')
      .locator('div.flex.items-center')
      .locator('.inline-flex.items-center.border.rounded-full')
      .first();
    await expect(postWithLabel).toBeVisible();
  }

  async validatePostTitle(title: string) {
    await expect(this.articleTitle).toHaveText(title);
  }

  async validatePostContantContainText(textContentLocator: string, textContentExpected: string) {
    await expect(this.page.locator(`#articleBody:has-text("${textContentLocator}")`)).toHaveText(textContentExpected);
  }
}
