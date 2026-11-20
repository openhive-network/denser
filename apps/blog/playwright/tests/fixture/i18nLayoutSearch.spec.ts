import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * The classic search results in the pseudo-locale and in Polish, at a desktop and two phone
 * viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'searchClassic' });

testI18nRoutes([
  { id: 'SEARCH', path: '/search?q=hive&s=relevance', ready: '[data-testid="post-list-item"]' }
]);
