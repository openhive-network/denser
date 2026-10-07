import { test, expect } from '../support/fixture-proxy-test';

/**
 * Logged-in homepage fixture test — demo of the auth-seeding flow.
 *
 * The test runs without touching the real login UI: the fixture-proxy-test
 * helper pre-injects a sealed iron-session cookie into the browser context
 * whenever `authenticatedUser` is set, so the app treats the user as already
 * logged in from the first navigation.
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

const EXPECTED_USERNAME = process.env.CI_TEST_USER || 'guest4test';

test.use({
  fixtureTestName: 'loggedInHomepage',
  authenticatedUser: {}
});

test.describe('Homepage — seeded logged-in user', () => {
  test('nav shows logged-in state (no login button, pencil is a link)', async ({
    page
  }) => {
    await page.goto('/');

    await expect(page.getByTestId('login-btn')).toBeHidden();
    await expect(page.getByTestId('signup-btn')).toBeHidden();

    const pencil = page.getByTestId('nav-pencil');
    await expect(pencil).toBeVisible();
    await expect(pencil.locator('xpath=ancestor::a[1]')).toHaveAttribute(
      'href',
      '/submit.html'
    );
  });

  test('/api/users/me returns the seeded username', async ({ page }) => {
    await page.goto('/');

    // Use the page's own APIRequestContext so the seeded session cookie
    // is sent along — the top-level `request` fixture has a separate jar.
    const res = await page.context().request.get('/api/users/me');
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.isLoggedIn).toBe(true);
    expect(body.username).toBe(EXPECTED_USERNAME);
  });
});
