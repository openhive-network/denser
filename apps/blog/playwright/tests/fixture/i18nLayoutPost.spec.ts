import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { BLOG_KNOWN_I18N_ISSUES, BLOG_NAMES, BLOG_USER_CONTENT } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale
} from '../../../../../playwright/support/i18n-layout';

/**
 * A post with its comments, and its voter list, in the pseudo-locale and in Polish, at a desktop and
 * two phone viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts). The post is postDetail.spec.ts's.
 */

test.use({ fixtureTestName: 'postDetail' });

const POST_PATH = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';

for (const locale of I18N_CHECK_LOCALES) {
  test(`I18N-POST-01 [${locale}]: a post with comments is translated and fits`, async ({
    page,
    context,
    baseURL
  }) => {
    await setUiLocale(context, locale, baseURL);
    await page.goto(POST_PATH);
    await new PostPage(page).waitForPostHydration();

    const issues = await checkI18nLayout(page, { locale, userContent: BLOG_USER_CONTENT, names: BLOG_NAMES });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });

  test(`I18N-POST-02 [${locale}]: the voter list is translated and fits`, async ({
    page,
    context,
    baseURL
  }) => {
    const postPage = new PostPage(page);
    await setUiLocale(context, locale, baseURL);
    await page.goto(POST_PATH);
    await postPage.waitForPostHydration();
    await postPage.postFooterVotes.click();
    await expect(postPage.postVoterList.locator('li').first()).toBeVisible();

    const issues = await checkI18nLayout(page, {
      locale,
      root: '[data-testid="list-of-voters"]',
      userContent: BLOG_USER_CONTENT,
      names: BLOG_NAMES
    });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });
}
