import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { HomePage } from '../support/pages/homePage';

/**
 * Korean is a UI language of the blog: a `NEXT_LOCALE=ko` cookie renders the feed in Korean with
 * `<html lang="ko">` and the Korean flag, and Korean can be chosen from the language menu.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const LOCALE_COOKIE = 'NEXT_LOCALE';
const FLAG_KR = '🇰🇷';
/** `navigation.main_nav_bar.posts` in Korean. */
const POSTS_KO = '게시물';
/** `navigation.communities_nav.all_posts` in Korean and English. */
const ALL_POSTS_KO = '모든 게시물';
const ALL_POSTS_EN = 'All posts';

const localeCookies = async (context: BrowserContext) =>
  (await context.cookies()).filter(({ name }) => name === LOCALE_COOKIE).map(({ value, path }) => ({ value, path }));

const loadFeed = async (page: Page) => {
  await page.goto('/trending');
  await expect(page.getByTestId('post-list-item').first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
};

const expectKorean = async (page: Page) => {
  const homePage = new HomePage(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(homePage.toggleLanguage).toHaveText(FLAG_KR);
  await expect(homePage.getNavPostsLink).toHaveText(POSTS_KO);
};

test('KO-LOCALE-01: NEXT_LOCALE=ko renders the feed in Korean, server-side too', async ({
  page,
  context,
  baseURL,
  request
}) => {
  await context.addCookies([{ name: LOCALE_COOKIE, value: 'ko', url: baseURL ?? '' }]);

  const html = await (await request.get('/trending', { headers: { cookie: `${LOCALE_COOKIE}=ko` } })).text();
  expect(html).toMatch(/<html[^>]*lang="ko"/);
  expect(html, 'expected the Korean sidebar string in the server HTML').toContain(ALL_POSTS_KO);
  expect(html, 'English copy should not leak through on a ko request').not.toContain(ALL_POSTS_EN);

  await loadFeed(page);
  await expectKorean(page);
});

test('KO-LOCALE-02: choosing Korean in the language menu renders Korean and stores the cookie', async ({
  page,
  context
}) => {
  const homePage = new HomePage(page);
  await loadFeed(page);

  await homePage.toggleLanguage.click();
  await page.getByTestId('ko').locator('..').click();

  await expectKorean(page);
  await expect.poll(() => localeCookies(context)).toEqual([{ value: 'ko', path: '/' }]);
});
