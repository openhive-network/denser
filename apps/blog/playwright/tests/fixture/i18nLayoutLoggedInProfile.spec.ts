import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';

/**
 * Another account's profile seen signed in, with its follow and mute buttons, in the pseudo-locale
 * and in Polish, at a desktop and two phone viewports, in a wide font: every text is translated and
 * fits (playwright/support/i18n-layout.ts). The profile is loggedInUserProfile.spec.ts's.
 */

test.use({ fixtureTestName: 'loggedInUserProfile', authenticatedUser: {} });

testI18nRoutes([
  { id: 'PROFILE-SIGNED-IN', path: '/@hiveio', ready: '[data-testid="profile-follow-button"]', loggedIn: true }
]);
