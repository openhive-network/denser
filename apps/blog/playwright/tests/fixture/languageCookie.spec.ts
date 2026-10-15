import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { HomePage } from '../support/pages/homePage';

/**
 * The `NEXT_LOCALE` cookie is the one source of the UI language: the texts, the header flag and
 * `<html lang>` all follow it, whatever an older build left in `localStorage.NEXT_LOCALE`. On a
 * shared origin the wallet writes the same `path=/` cookie, so a switch in either app is seen by the
 * other (#1205).
 */

test.use({ fixtureTestName: 'homeMainPage' });

const LOCALE_COOKIE = 'NEXT_LOCALE';
const FLAG_GB = '🇬🇧';
const FLAG_PL = '🇵🇱';
/** `navigation.main_nav_bar.posts` in English and Polish. */
const POSTS_EN = 'Posts';
const POSTS_PL = 'Posty';

/** Stores a language in `localStorage` the way older builds did (TTL envelope, no expiry). */
const seedLegacyStoredLanguage = (context: BrowserContext, locale: string) =>
  context.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('legacy-locale-seeded')) return;
      sessionStorage.setItem('legacy-locale-seeded', '1');
      localStorage.setItem(key, JSON.stringify({ value, expiresAt: null, createdAt: Date.now() }));
    },
    [LOCALE_COOKIE, locale]
  );

const localeCookies = async (context: BrowserContext) =>
  (await context.cookies()).filter(({ name }) => name === LOCALE_COOKIE).map(({ value, path }) => ({ value, path }));

const loadFeed = async (page: Page) => {
  await page.goto('/trending');
  await expect(page.getByTestId('post-list-item').first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
};

const expectLanguage = async (page: Page, { lang, flag, posts }: { lang: string; flag: string; posts: string }) => {
  const homePage = new HomePage(page);
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(homePage.toggleLanguage).toHaveText(flag);
  await expect(homePage.getNavPostsLink).toHaveText(posts);
};

test('LANG-COOKIE-01: a first visit with no cookie is English and stores one origin-wide cookie', async ({
  page,
  context
}) => {
  await loadFeed(page);

  await expectLanguage(page, { lang: 'en', flag: FLAG_GB, posts: POSTS_EN });
  await expect.poll(() => localeCookies(context)).toEqual([{ value: 'en', path: '/' }]);
});

test('LANG-COOKIE-02: the cookie wins over a stale localStorage language', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: LOCALE_COOKIE, value: 'pl', url: baseURL ?? '' }]);
  await seedLegacyStoredLanguage(context, 'en');

  await loadFeed(page);

  await expectLanguage(page, { lang: 'pl', flag: FLAG_PL, posts: POSTS_PL });
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LOCALE_COOKIE)).toBeNull();
});

test('LANG-COOKIE-03: a language another app of the origin switched to is shown, not the stored one', async ({
  page,
  context,
  baseURL
}) => {
  // The blog was switched to Polish, then the wallet to English (it writes only the cookie).
  await seedLegacyStoredLanguage(context, 'pl');
  await context.addCookies([{ name: LOCALE_COOKIE, value: 'en', url: baseURL ?? '' }]);

  await loadFeed(page);

  await expectLanguage(page, { lang: 'en', flag: FLAG_GB, posts: POSTS_EN });
});

test('LANG-COOKIE-04: a stored language from an older build stands in for a missing cookie once', async ({
  page,
  context
}) => {
  await seedLegacyStoredLanguage(context, 'pl');

  await loadFeed(page);

  await expectLanguage(page, { lang: 'pl', flag: FLAG_PL, posts: POSTS_PL });
  await expect.poll(() => localeCookies(context)).toEqual([{ value: 'pl', path: '/' }]);
  expect(await page.evaluate((key) => localStorage.getItem(key), LOCALE_COOKIE)).toBeNull();
});

test('LANG-COOKIE-05: switching replaces a path-scoped copy with the one origin-wide cookie', async ({
  page,
  context,
  baseURL
}) => {
  const homePage = new HomePage(page);
  // What a cookie written without `path=/` looks like
  await context.addCookies([
    { name: LOCALE_COOKIE, value: 'en', domain: new URL(baseURL ?? '').hostname, path: '/trending' }
  ]);
  await loadFeed(page);

  await homePage.toggleLanguage.click();
  await homePage.languageMenuPl.click();

  await expectLanguage(page, { lang: 'pl', flag: FLAG_PL, posts: POSTS_PL });
  expect(await localeCookies(context)).toEqual([{ value: 'pl', path: '/' }]);
});

test('LANG-COOKIE-06: a language the blog has no texts for is shown as English and kept in the cookie', async ({
  page,
  context,
  baseURL
}) => {
  await context.addCookies([{ name: LOCALE_COOKIE, value: 'de', url: baseURL ?? '' }]);

  await loadFeed(page);

  await expectLanguage(page, { lang: 'en', flag: FLAG_GB, posts: POSTS_EN });
  // Past the start-up effects, which would otherwise flip `<html lang>` or rewrite the cookie
  await page.waitForLoadState('networkidle');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await localeCookies(context)).toEqual([{ value: 'de', path: '/' }]);
});
