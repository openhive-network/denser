import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { loginViaHBAuth, HBAuthCredentials } from '../support/loginHelper';

/**
 * Login fixture tests.
 *
 * AUTH-01 — Login via HBAuth (safe-storage) using a posting key.
 * AUTH-09 — Logout from the application.
 *
 * Run in record mode to capture fixtures:
 *   pnpm --filter @hive/blog test:fixture:record
 *
 * Run in replay mode (default, stable & repeatable):
 *   pnpm --filter @hive/blog test:fixture
 *
 * Required env vars (apps/blog/.env.local):
 *   CI_TEST_USER              — username
 *   CI_TEST_USER_WIF_POSTING  — posting WIF private key
 */

test.use({ fixtureTestName: 'login' });

const SAFE_STORAGE_PASSWORD = 'testtest';

function getCredentials(): HBAuthCredentials {
  const username = process.env.CI_TEST_USER;
  const wifPosting = process.env.CI_TEST_USER_WIF_POSTING;

  if (!username || !wifPosting) {
    throw new Error(
      'Missing CI_TEST_USER or CI_TEST_USER_WIF_POSTING env vars. ' +
        'Add them to apps/blog/.env.local.'
    );
  }

  return { username, safeStoragePassword: SAFE_STORAGE_PASSWORD, wifPosting };
}

test.describe.skip('Login', () => {
  test('AUTH-01 — Login via HBAuth with posting key', async ({ page }) => {
    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    const credentials = getCredentials();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await loginViaHBAuth(page, credentials);

    await homePage.profileAvatarButton.click();

    await expect(profileMenu.profileMenuContent).toBeVisible();
    await profileMenu.validateUserNameInProfileMenu(credentials.username);
    await expect(profileMenu.logoutLink).toBeVisible();
  });

  test('AUTH-09 — Logout from the application', async ({ page }) => {
    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    const credentials = getCredentials();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await loginViaHBAuth(page, credentials);

    await homePage.profileAvatarButton.click();

    await expect(profileMenu.profileMenuContent).toBeVisible();
    await profileMenu.validateUserNameInProfileMenu(credentials.username);

    await profileMenu.logoutLink.click();

    await expect(profileMenu.profileMenuContent).not.toBeVisible();
    await expect(homePage.profileAvatarButton).not.toBeVisible();
    await expect(homePage.loginBtn).toBeVisible();
  });
});
