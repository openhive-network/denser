import { test } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { BLOG_KNOWN_I18N_ISSUES, BLOG_NAMES, BLOG_USER_CONTENT, testI18nRoutes } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale
} from '../../../../../playwright/support/i18n-layout';

/**
 * A profile page in the pseudo-locale and in Polish, at a desktop and two phone viewports, in a wide
 * font: every text is translated and fits (playwright/support/i18n-layout.ts). The profile is
 * userProfileTabs.spec.ts's.
 */

test.use({ fixtureTestName: 'userProfileTabs' });

for (const locale of I18N_CHECK_LOCALES) {
  test(`I18N-PROFILE-01 [${locale}]: a profile is translated and fits`, async ({
    page,
    context,
    baseURL
  }) => {
    await setUiLocale(context, locale, baseURL);
    await new ProfilePage(page).gotoProfilePage('@hiveio');

    const issues = await checkI18nLayout(page, { locale, userContent: BLOG_USER_CONTENT, names: BLOG_NAMES });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });
}

testI18nRoutes([
  { id: 'PROFILE-POSTS', path: '/@hiveio/posts', ready: '[data-testid="post-list-item"]' },
  { id: 'PROFILE-COMMENTS', path: '/@hiveio/comments', ready: '[data-testid="post-list-item"]' },
  { id: 'PROFILE-REPLIES', path: '/@hiveio/replies', ready: '[data-testid="post-list-item"]' },
  { id: 'PROFILE-PAYOUT', path: '/@hiveio/payout', ready: '[data-testid="profile-name"]' },
  { id: 'PROFILE-COMMUNITIES', path: '/@hiveio/communities', ready: '[data-testid="profile-name"]' },
  { id: 'PROFILE-FOLLOWERS', path: '/@hiveio/followers', ready: '[data-testid="profile-name"]' },
  { id: 'PROFILE-FOLLOWED', path: '/@hiveio/followed', ready: '[data-testid="profile-name"]' }
]);
