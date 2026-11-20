import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * A community's feed and its roles page in the pseudo-locale and in Polish, at a desktop and two
 * phone viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'tagCommunityFeeds' });

testI18nRoutes([
  { id: 'COMMUNITY-TRENDING', path: '/trending/hive-139531', ready: '[data-testid="post-list-item"]' },
  { id: 'COMMUNITY-ROLES', path: '/roles/hive-139531', ready: '[data-testid="community-role-row"]' }
]);
