import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { HomePage } from '../support/pages/homePage';
import { BLOG_KNOWN_I18N_ISSUES, BLOG_NAMES, BLOG_USER_CONTENT } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale
} from '../../../../../playwright/support/i18n-layout';

/**
 * The trending feed and the login dialog in the pseudo-locale and in Polish, at a desktop and two
 * phone viewports, in a wide font: every text is translated and fits (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'homeMainPage' });

for (const locale of I18N_CHECK_LOCALES) {
  test(`I18N-FEED-01 [${locale}]: the trending feed is translated and fits`, async ({
    page,
    context,
    baseURL
  }) => {
    await setUiLocale(context, locale, baseURL);
    await page.goto('/trending');
    await expect(page.getByTestId('post-list-item').first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    const issues = await checkI18nLayout(page, { locale, userContent: BLOG_USER_CONTENT, names: BLOG_NAMES });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });

  test(`I18N-FEED-02 [${locale}]: the login dialog is translated and fits`, async ({
    page,
    context,
    baseURL
  }) => {
    const homePage = new HomePage(page);
    await setUiLocale(context, locale, baseURL);
    await page.goto('/trending');
    await expect(async () => {
      await homePage.loginBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: TIMEOUTS.HYDRATION });

    const issues = await checkI18nLayout(page, { locale, root: '[role="dialog"]', names: BLOG_NAMES });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });
}
