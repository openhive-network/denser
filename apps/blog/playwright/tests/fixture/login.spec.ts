import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { getHBAuthCredentialsFromEnv, loginViaHBAuth } from '../support/loginHelper';

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
 *   GUEST4TEST2_WIF_POSTING            — posting WIF private key
 *   GUEST4TEST2_SAFE_STORAGE_PASSWORD  — safe-storage password
 */

test.use({ fixtureTestName: 'login' });

const USERNAME = 'guest4test';

test.describe('Login', () => {
  test('AUTH-01 — Login via HBAuth with posting key', async ({ page }) => {
    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    const credentials = getHBAuthCredentialsFromEnv(USERNAME);

    await page.goto('/', { waitUntil: 'commit' });
    await loginViaHBAuth(page, credentials);

    await homePage.profileAvatarButton.click();

    await expect(profileMenu.profileMenuContent).toBeVisible();
    await profileMenu.validateUserNameInProfileMenu(USERNAME);
    await expect(profileMenu.logoutLink).toBeVisible();
  });

  test('AUTH-09 — Logout from the application', async ({ page }) => {
    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    const credentials = getHBAuthCredentialsFromEnv(USERNAME);

    await page.goto('/', { waitUntil: 'commit' });
    await loginViaHBAuth(page, credentials);

    await homePage.profileAvatarButton.click();

    await expect(profileMenu.profileMenuContent).toBeVisible();
    await profileMenu.validateUserNameInProfileMenu(USERNAME);

    await profileMenu.logoutLink.click();

    await expect(profileMenu.profileMenuContent).not.toBeVisible();
    await expect(homePage.profileAvatarButton).not.toBeVisible();
    await expect(homePage.loginBtn).toBeVisible();
  });
});
