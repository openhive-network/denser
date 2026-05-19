import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import {
  POST_DETAIL_AUTHOR,
  POST_DETAIL_PERMLINK,
  POST_DETAIL_COMMUNITY,
  gotoLoggedIn
} from '../support/postDisplayContext';

/**
 * §4 Post Display & Views — post detail page (logged-in observer).
 *
 * Covers VIEW-08 ("Open single post — verify title, content, author,
 * votes, comments") against `gtg/hive-hardfork-25-jump-starter-kit` —
 * the same post pinned by the anonymous `postDetail/` fixture. As with
 * the tag/community spec, the logged-in observer needs its own fixture
 * dir because `database_api.list_votes` and a handful of account RPCs
 * differ once an authenticated observer is in the request.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog exec \
 *            playwright test --config=playwright.fixture.config.ts \
 *            loggedInPostDetail.spec.ts
 *          node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
 *            apps/blog/playwright/tests/mock/fixtures/loggedInPostDetail
 */

test.use({
  fixtureTestName: 'loggedInPostDetail',
  authenticatedUser: {}
});

test.describe('§4 Post Display & Views — post detail (logged-in observer)', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('VIEW-08 — Post detail page exposes title, body, author, payout, votes and comments', async ({ page }) => {
    await gotoLoggedIn(
      page,
      `/${POST_DETAIL_COMMUNITY}/@${POST_DETAIL_AUTHOR}/${POST_DETAIL_PERMLINK}/`
    );
    await postPage.waitForPostHydration();

    // Title, body, author header
    await expect(postPage.articleTitle).toBeVisible();
    await expect(postPage.articleBody).toBeVisible();
    await expect(postPage.articleAuthorData).toBeVisible();

    // Vote affordances available to the observer (no `login-btn` wrapper —
    // gotoLoggedIn already proved hydration finished on the logged-in
    // branch, so clicks land on the real upvote/downvote handlers).
    await expect(postPage.upvoteButton).toBeVisible();
    await expect(postPage.downvoteButton).toBeVisible();

    // Payout panel and tags
    await expect(postPage.footerPayouts).toBeVisible();
    await expect(postPage.hashtagsPosts).toBeVisible();

    // Comments tree — recorded post has prior comments, so the first
    // comment list item should render.
    await expect(postPage.commentListLocator.first()).toBeVisible();
  });
});
