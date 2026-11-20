import { test } from '../support/fixture-proxy-test';
import { gotoSubmitLoggedIn } from '../support/postCreationContext';
import { BLOG_KNOWN_I18N_ISSUES, BLOG_NAMES, BLOG_USER_CONTENT } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale
} from '../../../../../playwright/support/i18n-layout';

/**
 * The post editor in the pseudo-locale and in Polish, at a desktop and two phone viewports, in a wide
 * font: every text is translated and fits (playwright/support/i18n-layout.ts). The recording is
 * postCreate.spec.ts's.
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

for (const locale of I18N_CHECK_LOCALES) {
  test(`I18N-SUBMIT-01 [${locale}]: the post editor is translated and fits`, async ({
    page,
    context,
    baseURL
  }) => {
    await setUiLocale(context, locale, baseURL);
    await gotoSubmitLoggedIn(page);

    const issues = await checkI18nLayout(page, { locale, userContent: BLOG_USER_CONTENT, names: BLOG_NAMES });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });
}
