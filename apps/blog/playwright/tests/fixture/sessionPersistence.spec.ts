import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';

/**
 * Session-persistence fixture suite — §1 Authentication & Login (AUTH-10).
 *
 * Verifies the logged-in session survives a full `page.reload()`, offline and
 * deterministically. Two independent persistence carriers are exercised, one
 * per test:
 *
 *   1. Client (`localStorage['user']`) — `useUserCore` hydrates the UI from it
 *      with `refetchOnMount:false`, so it drives the visible header (avatar /
 *      no login button). Test 1 reloads and re-asserts the logged-in nav.
 *   2. Server (httpOnly iron-session `blog_session` cookie) — re-validated by
 *      `/api/users/me` on every request. Test 2 reloads, then calls that
 *      endpoint and asserts the seeded user is still returned.
 *
 * Why the reload is a genuine persistence check and not a tautology:
 *   - The cookie is set once via `addCookies`; it persists across reloads
 *     naturally and is re-sealed/re-validated server-side, untouched by any
 *     client-side seeding.
 *   - `localStorage` is durable across reloads on its own. The seeder's
 *     `addInitScript` re-affirms it on every navigation, but on reload it only
 *     rewrites the already-present, identical value — a no-op. The test would
 *     pass the same way without it, because the durable storage IS the carrier.
 *   - The replay proxy serves `entries[i % len]` (modulo cycling), so the
 *     repeated SSR RPCs a reload re-issues resolve to the same recorded
 *     responses instead of exhausting the fixture.
 *
 * Assertions deliberately cover only auth/nav state (not post content), so the
 * proxy's per-hash call counter advancing on reload is irrelevant.
 *
 * Anonymous-signing note: this flow never broadcasts, so no posting WIF is
 * needed — only `CI_TEST_USER` (or the default seeded user) matters.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright \
 *            --config=playwright.fixture.config.ts sessionPersistence
 * Replay:  pnpm --filter @hive/blog test:fixture -- sessionPersistence
 */

const EXPECTED_USERNAME = process.env.CI_TEST_USER || 'guest4test';

test.use({
  fixtureTestName: 'sessionPersistence',
  authenticatedUser: {}
});

test.describe('§1 Authentication — AUTH-10 session persistence after reload', () => {
  let homePage: HomePage;
  let profileMenu: ProfileUserMenu;

  test.beforeEach(({ page }) => {
    homePage = new HomePage(page);
    profileMenu = new ProfileUserMenu(page);
  });

  // Asserts the logged-in nav state: no login button, avatar present, and the
  // profile menu shows the seeded username with a logout entry.
  const expectLoggedInNav = async () => {
    await expect(homePage.loginBtn).toBeHidden();
    await expect(homePage.profileAvatarButton).toBeVisible();

    await homePage.profileAvatarButton.click();
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(EXPECTED_USERNAME);
    await expect(profileMenu.logoutLink).toBeVisible();
    await profileMenu.clickCloseProfileMenu();
  };

  test('AUTH-10 client session (localStorage) survives a reload', async ({ page }) => {
    await page.goto('/');
    // `login-btn` hides once `user.isLoggedIn` resolves — the hydration gate.
    await expect(homePage.loginBtn).toBeHidden();
    await expectLoggedInNav();

    await page.reload();

    // After the reload the client must rebuild the logged-in state from the
    // durable localStorage entry alone.
    await expect(homePage.loginBtn).toBeHidden();
    await expectLoggedInNav();
  });

  test('AUTH-10 server session (cookie) survives a reload', async ({ page }) => {
    await page.goto('/');
    await expect(homePage.loginBtn).toBeHidden();

    await page.reload();

    // Use the page's own APIRequestContext so the seeded session cookie rides
    // along — the top-level `request` fixture keeps a separate cookie jar.
    const res = await page.context().request.get('/api/users/me');
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.isLoggedIn).toBe(true);
    expect(body.username).toBe(EXPECTED_USERNAME);
  });
});
