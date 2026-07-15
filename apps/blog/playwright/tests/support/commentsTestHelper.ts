import { expect, test, type Locator, type Page } from '@playwright/test';
import { HomePage } from './pages/homePage';
import { PostPage } from './pages/postPage';
import { TIMEOUTS } from './constants';

/**
 * Configuration for finding posts with visible comments
 */
export interface FindVisibleCommentsOptions {
  /** Maximum number of posts to check before giving up */
  maxPostsToCheck?: number;
  /** Timeout for waiting for comments to load */
  commentsLoadTimeout?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<FindVisibleCommentsOptions> = {
  maxPostsToCheck: 5,
  commentsLoadTimeout: TIMEOUTS.ELEMENT_VISIBLE
};

/**
 * Result of finding a post with visible comments
 */
export interface FindVisibleCommentsResult {
  found: boolean;
  postTitle?: string;
  visibleCommentsCount?: number;
}

/**
 * Find and navigate to the first post that has VISIBLE comments.
 * For non-logged users, some comments may be hidden due to low reputation or muted status.
 * This function will iterate through posts until it finds one with actually visible comments.
 *
 * @param page - Playwright page object
 * @param homePage - HomePage POM instance
 * @param postPage - PostPage POM instance
 * @param options - Configuration options
 * @returns Result object with found status and post details
 */
export async function findPostWithVisibleComments(
  page: Page,
  homePage: HomePage,
  postPage: PostPage,
  options: FindVisibleCommentsOptions = {}
): Promise<FindVisibleCommentsResult> {
  const { maxPostsToCheck, commentsLoadTimeout } = { ...DEFAULT_OPTIONS, ...options };

  const postsCard = await homePage.getMainTimeLineOfPosts.all();
  const postsComments = await homePage.getPostChildren.all();
  const postsToCheck = Math.min(postsComments.length, maxPostsToCheck);

  for (let postIndex = 0; postIndex < postsToCheck; postIndex++) {
    const numberOfCommentsInPost = postsComments[postIndex];
    const postTitle = postsCard[postIndex].locator('[data-testid="post-title"] a');
    const commentsCount = await numberOfCommentsInPost.textContent();

    // Skip posts with 0 comments
    if (commentsCount === '0') {
      continue;
    }

    const postTitleText = await postTitle.textContent();

    // Navigate to the post
    await postTitle.click();
    await postPage.articleAuthorData.waitFor({ state: 'visible' });

    // Wait for comments to potentially load
    // Use a more reliable approach than networkidle
    await postPage.commentCardsHeaders.first().or(page.locator('[data-testid="comment-list"]')).waitFor({
      state: 'visible',
      timeout: commentsLoadTimeout
    }).catch(() => {
      // No comments loaded within timeout - that's fine, we'll check the count
    });

    // Check if there are VISIBLE comments (not hidden for non-logged users)
    const visibleCommentsCount = await postPage.commentCardsHeaders.count();

    if (visibleCommentsCount > 0) {
      return {
        found: true,
        postTitle: postTitleText ?? undefined,
        visibleCommentsCount
      };
    }

    // No visible comments, go back and try next post
    await page.goBack();
    await homePage.getMainTimeLineOfPosts.first().waitFor({ state: 'visible' });
  }

  return { found: false };
}

/**
 * Navigate to a post with visible comments or skip the test if none found.
 * This is a convenience wrapper for use in test files.
 *
 * @param page - Playwright page object
 * @param homePage - HomePage POM instance
 * @param postPage - PostPage POM instance
 * @param options - Configuration options
 */
export async function navigateToPostWithVisibleCommentsOrSkip(
  page: Page,
  homePage: HomePage,
  postPage: PostPage,
  options: FindVisibleCommentsOptions = {}
): Promise<void> {
  const result = await findPostWithVisibleComments(page, homePage, postPage, options);
  test.skip(!result.found, 'No posts with visible comments found on the page');
}

/**
 * Click a link that soft-navigates to a comment-view (or any post-route)
 * page and retry until the URL actually changes.
 *
 * The post route has no loading boundary (it holds the response on the
 * post lookup so missing posts return a real 404 - #930). Two
 * consequences for tests: Next has no shell to prefetch for these
 * links, so a click commits only after the full RSC round-trip; and a
 * click dispatched while the source page is still hydrating or busy
 * can have its router transition superseded and silently dropped -
 * job 3211939 hit exactly that (the same flow passed in sibling tests
 * on the same run; only the unluckiest worker slots lost the click).
 * Retrying the click until its observable effect (a URL change) is the
 * same contract a real user applies to a dead-feeling link.
 */
export async function clickAndAwaitUrlChange(page: Page, trigger: Locator): Promise<void> {
  const from = page.url();
  await expect(async () => {
    await trigger.click({ timeout: 2000 });
    await expect(page).not.toHaveURL(from, { timeout: 3000 });
  }).toPass({ timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
}
