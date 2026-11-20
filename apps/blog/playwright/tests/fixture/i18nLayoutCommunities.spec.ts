import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * The communities explorer, signed in, in the pseudo-locale and in Polish, at a desktop and two
 * phone viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'loggedInCommunitiesExplorer', authenticatedUser: {} });

testI18nRoutes([
  { id: 'COMMUNITIES', path: '/communities', ready: '[data-testid="community-list-item"]', loggedIn: true }
]);
