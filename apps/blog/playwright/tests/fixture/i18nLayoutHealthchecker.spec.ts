import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * The API node health checker in the pseudo-locale and in Polish, at a desktop and two phone
 * viewports, in a wide font: every text is translated and fits (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'healthchecker' });

testI18nRoutes([
  {
    id: 'HEALTHCHECKER',
    path: '/healthchecker',
    ready: '[data-testid="api-sets-component"]'
  }
]);
