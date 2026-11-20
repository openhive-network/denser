import { test, expect } from '../support/fixture-proxy-test';
import { NotificationsPage } from '../support/pages/notificationsPage';
import { BLOG_KNOWN_I18N_ISSUES, BLOG_NAMES, BLOG_USER_CONTENT } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale
} from '../../../../../playwright/support/i18n-layout';

/**
 * The signed-in user's notifications in the pseudo-locale and in Polish, at a desktop and two phone
 * viewports, in a wide font: every text is translated and fits (playwright/support/i18n-layout.ts).
 * The account is notifications.spec.ts's.
 */

const OWNER = 'gtg';

test.use({ fixtureTestName: 'notifications', authenticatedUser: { username: OWNER } });

for (const locale of I18N_CHECK_LOCALES) {
  test(`I18N-NOTIF-01 [${locale}]: the notifications are translated and fit`, async ({
    page,
    context,
    baseURL
  }) => {
    const notifications = new NotificationsPage(page);
    await setUiLocale(context, locale, baseURL);
    await notifications.gotoLoggedIn(OWNER);
    await expect(notifications.firstNotificationItem).toBeVisible();

    const issues = await checkI18nLayout(page, { locale, userContent: BLOG_USER_CONTENT, names: BLOG_NAMES });
    expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
  });
}
