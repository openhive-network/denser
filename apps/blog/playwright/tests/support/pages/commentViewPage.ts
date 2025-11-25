import { Locator, Page, expect } from '@playwright/test';

export class CommentViewPage {
  readonly page: Page;
  readonly getHeaderOfViewingCommentThread: Locator;
  readonly getHeaderOfCommentThread: Locator;
  readonly getReArticleTitle: Locator;
  readonly getViewFullContext: Locator;
  readonly getViewDirectParent: Locator;
  readonly getMainCommentAuthorData: Locator;
  readonly getMainCommentAuthorNameLink: Locator;
  readonly getMainCommentCommunityLink: Locator;
  readonly getMainCommentCategoryLink: Locator;
  readonly getMainCommentContent: Locator;
  readonly getMainCommentFooterAuthorData: Locator;
  readonly getMainCommentFooterCommunityLink: Locator;
  readonly getMainCommentFooterCategoryLink: Locator;
  readonly getMainCommentFooterAuthorNameLink: Locator;
  readonly getMainCommentUpvoteButton: Locator;
  readonly getMainCommentDownvoteButton: Locator;
  readonly getMainCommentPayout: Locator;
  readonly getMainCommentVotes: Locator;
  readonly getMainCommentReblogButton: Locator;
  readonly getMainCommentReplyButton: Locator;
  readonly getMainCommentResponsButton: Locator;
  readonly getCommentUserAffiliationTag: Locator;
  readonly getPopoverCardContent: Locator;

  readonly getResponseCommentHeader: Locator;
  readonly getResponseCommentAuthorNameLink: Locator;
  readonly getResponseCommentAuthorReputation: Locator;
  readonly getResponseCommentAffiliationTag: Locator;
  readonly getResponseCommentTimestamp: Locator;
  readonly getResponseCommentPageLink: Locator;
  readonly getResponseCommentContent: Locator;
  readonly getResponseCommentFooter: Locator;
  readonly getResponseCommentUpvoteButton: Locator;
  readonly getResponseCommentDownvoteButton: Locator;
  readonly getResponseCommentPayout: Locator;
  readonly getResponseCommentReply: Locator;
  readonly getResponseCommentCloseOpen: Locator;
  readonly payoutPostCardTooltip: Locator;
  readonly commentVote: Locator;
  readonly commentVoteTooltip: Locator;
  readonly commentGreenSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getHeaderOfViewingCommentThread = page.locator('h4.text-sm');
    this.getHeaderOfCommentThread = page.getByText('You are viewing a single comment');
    this.getReArticleTitle = page.locator('[data-testid="article-title"]');
    this.getViewFullContext = page.locator('[data-testid="view-the-full-context"]');
    this.getViewDirectParent = page.locator('[data-testid="view-the-direct-parent"]');
    this.getMainCommentAuthorData = page.locator('[data-testid="author-data"]');
    this.getMainCommentAuthorNameLink = page.locator('[data-testid="author-name-link"]').first();
    this.getMainCommentCommunityLink = page.locator('[data-testid="comment-community-title"]');
    this.getMainCommentCategoryLink = page.locator('[data-testid="comment-category-title"]');
    this.getMainCommentContent = page.locator('#articleBody').first();
    this.getMainCommentFooterAuthorData = page.locator('[data-testid="author-data-post-footer"]');
    this.getMainCommentFooterCommunityLink = page.locator(
      '[data-testid="footer-comment-community-category-link"]'
    );
    this.getMainCommentFooterCategoryLink = page.locator(
      '[data-testid="footer-comment-community-category-link"]'
    );
    this.getMainCommentFooterAuthorNameLink = page.locator('[data-testid="author-name-link"]').last();
    this.getMainCommentUpvoteButton = this.getMainCommentFooterAuthorData.locator(
      '[data-testid="upvote-button"]'
    );
    this.getMainCommentDownvoteButton = this.getMainCommentFooterAuthorData.locator(
      '[data-testid="downvote-button"]'
    );
    this.getMainCommentPayout = page.locator('[data-testid="comment-payout"]');
    this.getMainCommentVotes = page.locator('[data-testid="post-total-votes"]');
    this.getMainCommentReblogButton = page.locator('[data-testid="comment-respons-header"] button').first();
    this.getMainCommentReplyButton = page.locator('[data-testid="comment-reply"]');
    this.getMainCommentResponsButton = page.locator('[data-testid="comment-respons"]');
    this.getCommentUserAffiliationTag = page.locator('[data-testid="comment-user-affiliation-tag"]');
    this.getPopoverCardContent = page.locator('[data-testid="user-popover-card-content"]');

    this.getResponseCommentHeader = page.locator('[data-testid="comment-card-header"]');
    this.getResponseCommentAuthorNameLink = this.getResponseCommentHeader.locator(
      '[data-testid="author-name-link"]'
    );
    this.getResponseCommentAuthorReputation = this.getResponseCommentHeader.locator(
      '[data-testid="author-reputation"]'
    );
    this.getResponseCommentAffiliationTag = this.getResponseCommentHeader.locator(
      '[data-testid="comment-user-affiliation-tag"]'
    );
    this.getResponseCommentTimestamp = this.getResponseCommentHeader.locator(
      '[data-testid="comment-timestamp-link"]'
    );
    this.getResponseCommentPageLink = this.getResponseCommentHeader.locator(
      '[data-testid="comment-page-link"]'
    );
    this.getResponseCommentContent = page.locator('[data-testid="comment-card-description"]');
    this.getResponseCommentFooter = page.locator('[data-testid="post-card-footer"]');
    this.getResponseCommentUpvoteButton = this.getResponseCommentFooter.locator(
      '[data-testid="comment-card-footer-upvote"]'
    );
    this.getResponseCommentDownvoteButton = this.getResponseCommentFooter.locator(
      '[data-testid="comment-card-footer-downvote"]'
    );
    this.getResponseCommentPayout = this.getResponseCommentFooter.locator('[data-testid="post-payout"]');
    this.getResponseCommentReply = this.getResponseCommentFooter.locator(
      '[data-testid="comment-card-footer-reply"]'
    );
    this.getResponseCommentCloseOpen = page.locator('[data-testid="comment-close-open"]').nth(1);
    this.payoutPostCardTooltip = page.getByTestId('payout-post-card-tooltip');
    this.commentVote = page.locator('[data-testid="post-total-votes"]');
    this.commentVoteTooltip = page.getByTestId('post-card-votes-tooltip');
    this.commentGreenSection = page.locator('.bg-card-noContent');
  }

  async validataCommentViewPageIsLoaded(postTitle: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.getReArticleTitle['_selector']);
    await expect(this.page.getByText('You are viewing a single comment')).toBeVisible();
    // await expect(this.getReArticleTitle.textContent).toContain(postTitle);
  }
}
