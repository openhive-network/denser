import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { gotoLoggedIn } from '../support/postDisplayContext';

/**
 * "You Might Also Like" suggestions on the post detail page.
 *
 * Only a signed-in reader asks hivesense for similar posts and sees the
 * section: an anonymous visit (every crawler) makes no similar request, and a
 * sign-out on the page removes the section.
 *
 * The recorded hivesense `similar` response (postDetail fixture set) is in
 * the current API shape: full posts without `post_id`. The panel must still
 * render them, and must only claim "hidden due to low ratings" when posts
 * came back and the reputation/gray filter removed every one.
 *
 * The production build sends hivesense calls to REACT_APP_AI_DOMAIN, not the
 * fixture proxy, so the recording is served from the browser via page.route.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postSuggestions
 */

test.use({ fixtureTestName: 'postSuggestions' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';
const SIMILAR_ROUTE = '**/hivesense-api/posts/*/*/similar*';
const RECORDED_SUGGESTION_COUNT = 10;
const LOW_REPUTATION = 10;
const LOCALE_COOKIE = 'NEXT_LOCALE';
// The first recorded suggestion was created 2022-10-09T21:18:51 (UTC).
const FIRST_SUGGESTION_DATE_PL = '09.10.2022';
const SIMILAR_RECORDING = path.resolve(
  __dirname,
  '..',
  'mock',
  'fixtures',
  'postDetail',
  '0007-GET_hivesense-api_posts_gtg_hive-hardfork-25-jump-starter-kit_similar.json'
);

// React Query's first retry of a failed query fires 1 s after the failure.
const PAST_FIRST_RETRY_MS = 2_500;
// Longer than a client query takes to start after hydration, so a similar request would have left.
const PAST_CLIENT_QUERIES_MS = 3_000;
// A cold HiveSense query: slower than the read chain's 5 s attempt timeout, within the call's own 15 s.
const COLD_QUERY_DELAY_MS = 6_500;
const SUGGESTIONS_AFTER_COLD_QUERY_MS = 15_000;
const NO_EMBEDDING_RESPONSE = {
  code: 'P0001',
  details: null,
  hint: null,
  message: 'Post @gtg/hive-hardfork-25-jump-starter-kit has no stored embedding (too short or not yet processed)'
};

type SimilarPost = Record<string, unknown>;

const recordedSimilarPosts = (): SimilarPost[] =>
  JSON.parse(fs.readFileSync(SIMILAR_RECORDING, 'utf-8')).response;

const serveSimilarPosts = (page: Page, posts: SimilarPost[], delayMs = 0) =>
  page.route(SIMILAR_ROUTE, async (route) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ json: posts, headers: { 'access-control-allow-origin': '*' } });
  });

/** Records the URL of every similar-posts request the page sends from now on */
function recordSimilarRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/similar')) urls.push(request.url());
  });
  return urls;
}

test.describe('Post suggestions for an anonymous reader (fixture-based)', () => {
  test('POST-SUGGEST-07: an anonymous visit asks for no similar posts and shows no suggestions', async ({ page }) => {
    await serveSimilarPosts(page, recordedSimilarPosts());
    const similarRequests = recordSimilarRequests(page);

    const postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForTimeout(PAST_CLIENT_QUERIES_MS);

    expect(similarRequests).toEqual([]);
    await expect(page.getByTestId('suggestions-list')).toHaveCount(0);
    await expect(page.getByText('You Might Also Like')).toHaveCount(0);
  });
});

test.describe('Post suggestions for a signed-in reader (fixture-based)', () => {
  test.use({ authenticatedUser: {} });

  test('POST-SUGGEST-08: a signed-in visit asks for similar posts once and shows them', async ({ page }) => {
    await serveSimilarPosts(page, recordedSimilarPosts());
    const similarRequests = recordSimilarRequests(page);

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();

    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT);
    await page.waitForTimeout(PAST_FIRST_RETRY_MS);
    expect(similarRequests).toHaveLength(1);
  });

  test('POST-SUGGEST-09: signing out on the post page removes the suggestions without a reload', async ({
    page
  }) => {
    await serveSimilarPosts(page, recordedSimilarPosts());
    const homePage = new HomePage(page);
    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();
    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT);
    const similarRequests = recordSimilarRequests(page);

    await homePage.profileAvatarButton.click();
    await new ProfileUserMenu(page).logoutLink.click();

    await expect(homePage.loginBtn).toBeVisible();
    await expect(page.getByTestId('suggestions-list')).toHaveCount(0);
    await expect(postPage.articleBody).toBeVisible();
    expect(similarRequests).toEqual([]);
  });
  test('POST-SUGGEST-01: suggestions without post_id render as cards', async ({ page }) => {
    await serveSimilarPosts(page, recordedSimilarPosts());

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();

    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT);
    await expect(postPage.suggestionCardTitles.first()).toHaveText('Hive HardFork 26 Jump Starter Kit');
    await expect(postPage.suggestionsAllHiddenMessage).toHaveCount(0);
    await expect(postPage.suggestionsToggle).toHaveCount(0);
  });

  test('POST-SUGGEST-10: a Polish reader sees suggestion dates in the Polish format', async ({
    page,
    context,
    baseURL
  }) => {
    await context.addCookies([{ name: LOCALE_COOKIE, value: 'pl', url: baseURL ?? '' }]);
    await serveSimilarPosts(page, recordedSimilarPosts());

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();

    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT);
    const firstDate = page.getByTestId('suggestions-list').locator('time').first();
    await expect(firstDate).toHaveText(FIRST_SUGGESTION_DATE_PL);
    await expect(firstDate).toHaveAttribute('datetime', '2022-10-09T21:18:51.000Z');
  });

  test('POST-SUGGEST-02: all low-rated suggestions show the hidden message and Show all toggle', async ({
    page
  }) => {
    const lowRated = recordedSimilarPosts().map((post) => ({ ...post, author_reputation: LOW_REPUTATION }));
    await serveSimilarPosts(page, lowRated);

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();

    await expect(postPage.suggestionsAllHiddenMessage).toContainText(
      'All suggested posts were hidden due to low ratings.'
    );
    await expect(postPage.suggestionCardTitles).toHaveCount(0);
    await expect(postPage.suggestionsToggle).toHaveText('Show all');

    await postPage.suggestionsToggle.click();
    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT);
    await expect(postPage.suggestionsAllHiddenMessage).toHaveCount(0);
    await expect(postPage.suggestionsToggle).toHaveText('Hide');

    await postPage.suggestionsToggle.click();
    await expect(postPage.suggestionCardTitles).toHaveCount(0);
    await expect(postPage.suggestionsAllHiddenMessage).toBeVisible();
  });

  test('POST-SUGGEST-03: an empty similar response hides the suggestions section', async ({ page }) => {
    await serveSimilarPosts(page, []);
    const similarServed = page.waitForResponse((response) => response.url().includes('/similar'));

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();
    await similarServed;

    await expect(page.getByText('You Might Also Like')).toHaveCount(0);
    await expect(postPage.suggestionsAllHiddenMessage).toHaveCount(0);
  });

  test('POST-SUGGEST-04: a post without a stored embedding asks for suggestions once and shows none', async ({
    page
  }) => {
    await page.route(SIMILAR_ROUTE, (route) =>
      route.fulfill({
        status: 400,
        json: NO_EMBEDDING_RESPONSE,
        headers: { 'access-control-allow-origin': '*' }
      })
    );
    const similarRequests = recordSimilarRequests(page);
    const similarServed = page.waitForResponse((response) => response.url().includes('/similar'));

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();
    await similarServed;
    // A retry leaves no trace in the page: wait past the moment React Query would send it.
    await page.waitForTimeout(PAST_FIRST_RETRY_MS);

    expect(similarRequests).toHaveLength(1);
    await expect(postPage.articleBody).toBeVisible();
    await expect(page.getByText('You Might Also Like')).toHaveCount(0);
    await expect(postPage.suggestionsAllHiddenMessage).toHaveCount(0);
  });

  test('POST-SUGGEST-05: suggestions of a cold query slower than the attempt timeout still render', async ({
    page
  }) => {
    test.setTimeout(60_000);
    await serveSimilarPosts(page, recordedSimilarPosts(), COLD_QUERY_DELAY_MS);

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();

    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT, {
      timeout: SUGGESTIONS_AFTER_COLD_QUERY_MS
    });
  });

  test('POST-SUGGEST-06: a failing similar call shows no suggestions, logs no error and is not retried', async ({
    page
  }) => {
    await page.route(SIMILAR_ROUTE, (route) =>
      route.fulfill({
        status: 503,
        json: { message: 'Service unavailable' },
        headers: { 'access-control-allow-origin': '*' }
      })
    );
    const similarRequests = recordSimilarRequests(page);
    const similarErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /similar/i.test(msg.text())) similarErrors.push(msg.text());
    });
    const similarServed = page.waitForResponse((response) => response.url().includes('/similar'));

    const postPage = new PostPage(page);
    await gotoLoggedIn(page, POST_URL);
    await postPage.waitForPostHydration();
    await similarServed;
    await page.waitForTimeout(PAST_FIRST_RETRY_MS);

    expect(similarRequests).toHaveLength(1);
    expect(similarErrors).toEqual([]);
    await expect(postPage.articleBody).toBeVisible();
    await expect(page.getByText('You Might Also Like')).toHaveCount(0);
  });
});
