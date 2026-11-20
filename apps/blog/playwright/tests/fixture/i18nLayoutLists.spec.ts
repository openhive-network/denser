import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * An account's mute and blacklist pages in the pseudo-locale and in Polish, at a desktop and two
 * phone viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts).
 */

test.use({ fixtureTestName: 'userLists' });

testI18nRoutes([
  { id: 'LIST-BLACKLISTED', path: '/@hive.blog/lists/blacklisted', ready: '[data-testid="user-list-area"]' },
  { id: 'LIST-MUTED', path: '/@hiveio/lists/muted', ready: '[data-testid="user-list-area"]' },
  {
    id: 'LIST-FOLLOWED-BLACKLISTS',
    path: '/@hiveio/lists/followed_blacklists',
    ready: '[data-testid="user-list-area"]'
  },
  {
    id: 'LIST-FOLLOWED-MUTED',
    path: '/@hiveio/lists/followed_muted_lists',
    ready: '[data-testid="user-list-area"]'
  }
]);
