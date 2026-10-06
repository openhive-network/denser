import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { settleAfterLoad } from '../support/wasmRequests';
import { HomePage } from '../support/pages/homePage';

/**
 * The browser downloads only the UI language it renders (and English, the fallback), not every
 * language's `common_blog.json`. Other languages are fetched when the user switches.
 *
 * Bundle names are hashed in the production build, so a locale bundle is recognised by its
 * content: every `common_blog.json` has the `global.no_rewards` key, and its value tells the
 * language apart.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const NO_REWARDS_VALUE = /no_rewards\\?"?\s*:\s*\\?"([^"\\]*)/;
const NO_REWARDS_EN = 'No rewards pending redemption.';
const NO_REWARDS_ES = 'No hay recompensas pendientes de canjear.';
/** `navigation.main_nav_bar.posts` in Polish. */
const POSTS_PL = 'Posty';

/** Records the body of every script the page loads; returns the (live) list. */
const recordScripts = (page: Page): Promise<string>[] => {
  const scripts: Promise<string>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'script') return;
    // A redirect or a response the browser dropped has no body; it carries no translations.
    scripts.push(response.text().catch(() => ''));
  });
  return scripts;
};

/** The `global.no_rewards` value of each locale bundle among `scripts`. */
const noRewardsValues = async (scripts: Promise<string>[]): Promise<string[]> =>
  (await Promise.all(scripts)).flatMap((body) => NO_REWARDS_VALUE.exec(body)?.[1] ?? []);

/** Loads the feed; returns the `global.no_rewards` value of each locale bundle it downloaded. */
const loadFeed = async (page: Page): Promise<string[]> => {
  const scripts = recordScripts(page);
  await page.goto('/trending');
  await expect(page.getByTestId('post-list-item').first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);
  return noRewardsValues(scripts);
};

test('LOCALE-BUNDLES-01: a logged-out English load downloads only the English translations', async ({
  page
}) => {
  const bundles = await loadFeed(page);

  expect(bundles).toEqual([NO_REWARDS_EN]);
});

test('LOCALE-BUNDLES-02: a Spanish load downloads Spanish and the English fallback only', async ({
  page,
  baseURL
}) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'es', url: baseURL ?? '' }]);

  const bundles = await loadFeed(page);

  expect(bundles.sort()).toEqual([NO_REWARDS_ES, NO_REWARDS_EN].sort());
});

test('LOCALE-BUNDLES-03: switching the language downloads the new language and renders it', async ({
  page
}) => {
  const homePage = new HomePage(page);
  expect(await loadFeed(page)).toEqual([NO_REWARDS_EN]);
  const scripts = recordScripts(page);

  await homePage.toggleLanguage.click();
  await homePage.languageMenuPl.click();

  await expect(homePage.getNavPostsLink).toHaveText(POSTS_PL);
  await settleAfterLoad(page);
  expect(await noRewardsValues(scripts), 'only the Polish bundle is fetched on the switch').toHaveLength(1);
});
