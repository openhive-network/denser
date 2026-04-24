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
