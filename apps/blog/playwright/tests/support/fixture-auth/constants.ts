/**
 * Shared constants for the fixture-mode auth seeder.
 *
 * Both `playwright.fixture.config.ts` (server side, via webServer.env) and
 * the seeder (test side, to produce matching sealed cookies) must agree on
 * these values, so they live here.
 */

/** APP_NAME drives iron-session's cookieName via `@smart-signer/lib/session`. */
export const FIXTURE_APP_NAME = 'blog';

/** Resulting iron-session cookie name for the blog app. */
export const FIXTURE_COOKIE_NAME = `${FIXTURE_APP_NAME}_session`;

/**
 * iron-session requires a password >= 32 chars. Fixture tests never exercise
 * real auth, so a fixed dummy value is fine — we just need the test-side
 * seeder and the app-side webServer to agree on it.
 */
export const FIXTURE_COOKIE_PASSWORD =
  'fixture-tests-dummy-cookie-password-not-a-secret';

/**
 * Posting key the seeder stores for the logged-in user when
 * CI_TEST_USER_WIF_POSTING is not set, so a signing flow completes instead of
 * stopping at the password dialog. Randomly generated and belonging to no
 * account: fixture tests intercept every broadcast and stub verify_authority,
 * so the key never has to match the account's recorded authority.
 */
export const FIXTURE_POSTING_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';
