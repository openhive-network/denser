import { Locator, Page, expect } from '@playwright/test';
import { HomePage } from './homePage';
import { TIMEOUTS } from '../constants';

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
  readonly commentContentToHover: Locator;
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
  readonly footerReblogIcon: Locator;
  readonly footerReblogTooltip: Locator;
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
  readonly commentListLocator: Locator;
  readonly articleBodyParagraph: string;
  readonly postingToDropdown: Locator;
  readonly postEditButton: Locator;
  readonly postDeleteButton: Locator;
  readonly deleteDialogHeader: Locator;
  readonly deleteDialogConfirm: Locator;
  readonly deleteDialogCancel: Locator;
  readonly articleTable: Locator;
  readonly articleIframes: Locator;
  readonly twitterWrappers: Locator;
  readonly instagramWrappers: Locator;
  readonly pendingIndexingMessage: Locator;
  readonly notFoundPage: Locator;
  readonly notFoundHeading: Locator;
  readonly postFooterTimestamp: Locator;
  readonly authorHeaderReputation: Locator;
  readonly authorHeaderAvatar: Locator;
  readonly pinButton: Locator;
  readonly unpinButton: Locator;
  readonly changeTitleTrigger: Locator;
  readonly changeTitleInput: Locator;
  readonly changeTitleSave: Locator;

  constructor(page: Page) {
    this.page = page;
    this.showPostBodyBtn = page.locator('div').filter({
      hasText: /^Content (were hidden due to low ratings|hidden (by community moderators|because parent content is muted|due to low author reputation)|hidden: author (not allowed to post in this community|is muted in this community))\.Show$/
    }).getByRole('button');
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
    this.commentContentToHover = page.getByTestId('comment-card-to-hover');
    this.commentListItem = '[data-testid="comment-list-item"]'
    this.commentListLocator = page.locator('[data-testid="comment-list"]');
    this.commentAuthorLink = page.locator(
      '[data-testid="comment-card-header"] [data-testid="author-name-link"] span[class="font-semibold text-foreground hover:text-destructive"]'
    );
    this.commentAuthorReputation = page.locator(
      '[data-testid="comment-card-header"] [data-testid="author-reputation"]'
    );
    this.commentCardsHeaders = page.locator('[data-testid="comment-card-header"]');
    this.commentCardsHeadersAutorAndReputation = this.commentAuthorLink.locator('..'); // Parent of commentAuthorLink
    this.commentCardsHeadersTimeStampLink = page.locator('[data-testid="comment-timestamp-link"]');
    this.commentCardsTitles = page.locator('[data-testid="post-title"]');
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
    // Interactive reblog on post pages
    this.footerReblogIcon = page.locator('[data-testid="post-footer-reblog-icon"]');
    this.footerReblogTooltip = page.locator('[data-testid="post-footer-reblog-tooltip"]');
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
    this.postsCommentsFirstAvatar = page.locator('[data-testid="post-card-avatar"]').first();
    this.mutedPostsBannedImageText = page.locator('#articleBody .text-red-500').first();
    this.userPostMenu = page.getByTestId('user-post-menu');
    this.postFooterUpvoteTooltip = page.locator('[data-testid="upvote-button-tooltip"]');
    this.postFooterDownvoteTooltip = page.locator('[data-testid="downvote-button-tooltip"]');
    this.firstPostAffiliationTag = page.locator('[data-testid="affiliation-tag-badge"]').first();
    this.postingToDropdown = page.locator('[data-testid="posting-to-list-trigger"]');
    this.postEditButton = page.getByTestId('post-edit');
    this.postDeleteButton = page.getByTestId('comment-card-footer-delete');
    // PostDeleteDialog (AlertDialog) reuses the "flag-dialog-*" testids
    // shared with the comment flag flow — header carries `Confirm Delete Post`
    // (label prop), `flag-dialog-ok` triggers the delete_comment_operation.
    this.deleteDialogHeader = page.getByTestId('flag-dialog-header');
    this.deleteDialogConfirm = page.getByTestId('flag-dialog-ok');
    this.deleteDialogCancel = page.getByTestId('flag-dialog-cancel');
    this.articleTable = page.locator('#articleBody table');
    this.articleIframes = page.locator('#articleBody iframe');
    this.twitterWrappers = page.locator('#articleBody .twitterWrapper');
    this.instagramWrappers = page.locator('#articleBody .instagramWrapper');
    this.pendingIndexingMessage = page.locator('[data-testid="pending-indexing-message"]');
    this.notFoundPage = page.locator('[data-testid="not-found-page"]');
    this.notFoundHeading = this.notFoundPage.locator('h1');
    this.postFooterTimestamp = page.locator('[data-testid="post-footer-timestamp"]');
    this.authorHeaderReputation = this.articleAuthorData.locator('[data-testid="author-reputation"]');
    this.authorHeaderAvatar = this.articleAuthorData.locator('[data-testid="user-avatar"]');
    // Moderator-only controls on the main post (rendered when userCanModerate
    // and depth === 0). Pin/unpin buttons are unique to the main post.
    this.pinButton = page.getByTestId('post-pin-button');
    this.unpinButton = page.getByTestId('post-unpin-button');
    // The change-title PenTool lives in the shared UserInfo, which also
    // renders for every comment author — scope to the post-header block (the
    // first author-data on the page). Dialog content is a body-level portal,
    // so input/save stay page-scoped.
    this.changeTitleTrigger = this.articleAuthorData
      .first()
      .getByTestId('community-change-title-trigger');
    this.changeTitleInput = page.getByTestId('community-change-title-input');
    this.changeTitleSave = page.getByTestId('community-change-title-save');
  }

  /** Open the post-header change-title dialog, set a new title, and save. */
  async changeAuthorTitle(newTitle: string): Promise<void> {
    await this.changeTitleTrigger.click();
    await expect(this.changeTitleInput).toBeVisible();
    await this.changeTitleInput.fill(newTitle);
    await this.changeTitleSave.click();
  }

  async waitForPostHydration(timeout = TIMEOUTS.HYDRATION) {
    await this.page.waitForSelector('[data-testid="author-data-post-footer"]', { timeout });
  }

  async gotoHomePage() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.postListItemOnHomePage['_selector']);
  }

  async gotoPostPage(communityCategoryName: string, author: string, permlink: string) {
    await this.page.goto(`/${communityCategoryName}/@${author}/${permlink}/`);
    // Wait for the full window load event rather than just domcontentloaded.
    // On webkit testenv React hydration completes noticeably later than on
    // chromium; without this, locators resolved immediately after navigation
    // can point to SSR-rendered nodes that get detached during hydration,
    // causing scrollIntoViewIfNeeded / getComputedStyle races.
    await this.page.waitForLoadState('load');
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
    // Defensive wait: on webkit a locator captured before React hydration
    // can resolve to a detached SSR node, in which case getComputedStyle
    // returns an empty string. waitFor re-resolves to the live element.
    await element.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
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

  async waitForArticleImages(timeout = TIMEOUTS.IMAGE_LOAD): Promise<void> {
    // Force eager loading on every article image so lazy-loaded ones below the
    // fold start downloading immediately instead of blocking the wait below.
    await this.page.evaluate(() => {
      document.querySelectorAll('#articleBody img').forEach((img) => {
        (img as HTMLImageElement).loading = 'eager';
      });
    });

    // Best-effort wait: long posts may contain slow or broken external images
    // (dead CDNs, hung requests) whose `complete` flag never flips to true.
    // We don't want one bad image to fail the whole test — the screenshot
    // assertion that follows is the actual signal, and `maxDiffPixelRatio`
    // tolerates minor differences.
    try {
      await this.page.waitForFunction(() => {
        const images = document.querySelectorAll('#articleBody img');
        return Array.from(images).every((img) => (img as HTMLImageElement).complete);
      }, { timeout });
    } catch {
      // Timed out waiting for all images — proceed anyway.
    }
  }

  getUserMentionLink(username: string): Locator {
    return this.page.locator(`#articleBody a[href*="/@${username}"]`);
  }

  async validateUserMentionLink(username: string) {
    const link = this.getUserMentionLink(username);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', new RegExp(`/@${username}`));
  }

  getTwitterWrappersIn(parent: Locator): Locator {
    return parent.locator('.twitterWrapper');
  }

  getInstagramWrappersIn(parent: Locator): Locator {
    return parent.locator('.instagramWrapper');
  }
}
