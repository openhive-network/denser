import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * The signed-in account's feeds of its communities and of the authors it follows, in the
 * pseudo-locale and in Polish, at a desktop and two phone viewports, in a wide font: every text is
 * translated and fits (playwright/support/i18n-layout.ts). The feeds are loggedInMyFeeds.spec.ts's.
 */

test.use({ fixtureTestName: 'loggedInMyFeeds', authenticatedUser: {} });

testI18nRoutes([
  { id: 'MY-COMMUNITIES', path: '/trending/my', ready: '[data-testid="post-list-item"]', loggedIn: true },
  {
    id: 'MY-FRIENDS',
    path: '/@guest4test/feed',
    ready: '[data-testid="user-has-not-started-blogging-yet"]',
    loggedIn: true
  }
]);
