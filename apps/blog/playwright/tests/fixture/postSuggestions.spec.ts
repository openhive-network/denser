import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * "You Might Also Like" suggestions on the post detail page.
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

test.use({ fixtureTestName: 'postDetail' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';
const SIMILAR_ROUTE = '**/hivesense-api/posts/*/*/similar*';
const RECORDED_SUGGESTION_COUNT = 10;
const LOW_REPUTATION = 10;
const SIMILAR_RECORDING = path.resolve(
  __dirname,
  '..',
  'mock',
  'fixtures',
  'postDetail',
  '0007-GET_hivesense-api_posts_gtg_hive-hardfork-25-jump-starter-kit_similar.json'
);

type SimilarPost = Record<string, unknown>;

const recordedSimilarPosts = (): SimilarPost[] =>
  JSON.parse(fs.readFileSync(SIMILAR_RECORDING, 'utf-8')).response;

const serveSimilarPosts = (page: Page, posts: SimilarPost[]) =>
  page.route(SIMILAR_ROUTE, (route) =>
    route.fulfill({ json: posts, headers: { 'access-control-allow-origin': '*' } })
  );

test.describe('Post suggestions (fixture-based)', () => {
  test('POST-SUGGEST-01: suggestions without post_id render as cards', async ({ page }) => {
    await serveSimilarPosts(page, recordedSimilarPosts());

    const postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.suggestionCardTitles).toHaveCount(RECORDED_SUGGESTION_COUNT);
    await expect(postPage.suggestionCardTitles.first()).toHaveText('Hive HardFork 26 Jump Starter Kit');
    await expect(postPage.suggestionsAllHiddenMessage).toHaveCount(0);
    await expect(postPage.suggestionsToggle).toHaveCount(0);
  });

  test('POST-SUGGEST-02: all low-rated suggestions show the hidden message and Show all toggle', async ({
    page
  }) => {
    const lowRated = recordedSimilarPosts().map((post) => ({ ...post, author_reputation: LOW_REPUTATION }));
    await serveSimilarPosts(page, lowRated);

    const postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
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
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();
    await similarServed;

    await expect(page.getByText('You Might Also Like')).toHaveCount(0);
    await expect(postPage.suggestionsAllHiddenMessage).toHaveCount(0);
  });
});
