import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * The settings page of the signed-in account in the pseudo-locale and in Polish, at a desktop and
 * two phone viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'loggedInUserSettings', authenticatedUser: {} });

testI18nRoutes([
  { id: 'SETTINGS', path: '/@guest4test/settings', ready: '[data-testid="profile-name"]', loggedIn: true }
]);
