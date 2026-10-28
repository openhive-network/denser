import { test, expect } from '../support/fixture-proxy-test';
import { clickSubmenuItem, hoverSubmenuItem } from '../support/uiPrimitives';

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
    await expect(pencil).toHaveAttribute('href', '/submit.html');
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

  test('Esc closes the Theme submenu first, then the profile menu', async ({ page }) => {
    await page.goto('/');

    const userMenu = page.getByTestId('user-profile-menu-content');
    const themeButton = userMenu.getByTestId('theme-mode');
    const themeItems = page.getByTestId('theme-mode-item');

    await expect(async () => {
      await page.getByTestId('profile-avatar-button').click();
      await expect(userMenu).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000 });

    await themeButton.click();
    await expect(themeItems.first()).toBeVisible();
    // Off the trigger, so the synthetic pointermove after the submenu closes cannot hover it open again
    await hoverSubmenuItem(page, themeItems.first());

    await page.keyboard.press('Escape');
    await expect(themeItems.first()).toBeHidden();
    await expect(userMenu).toBeVisible();
    await expect(themeButton).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(userMenu).toBeHidden();
  });

  test('the Theme item is a keyboard submenu: ArrowRight, Enter and Space open it, ArrowLeft and Esc return to it, and Enter applies a theme', async ({
    page
  }) => {
    await page.goto('/');

    const avatar = page.getByTestId('profile-avatar-button');
    const userMenu = page.getByTestId('user-profile-menu-content');
    const theme = userMenu.getByRole('menuitem', { name: 'Theme' });
    const submenu = page.getByRole('menu', { name: 'Theme' });
    const light = submenu.getByRole('menuitemradio', { name: 'Light' });
    const dark = submenu.getByRole('menuitemradio', { name: 'Dark' });

    await expect(async () => {
      await avatar.press('Enter');
      await expect(userMenu).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 30000 });
    await expect(theme).toHaveAttribute('aria-haspopup', 'menu');
    await expect(theme.locator('button')).toHaveCount(0);
    await expect(userMenu.getByRole('menuitem', { name: 'Language' })).toHaveAttribute('aria-haspopup', 'menu');

    await expect(async () => {
      await page.keyboard.press('ArrowDown');
      await expect(theme).toBeFocused({ timeout: 200 });
    }).toPass({ timeout: 10000 });

    await page.keyboard.press('ArrowRight');
    await expect(light).toBeFocused();
    await expect(theme).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(submenu).toBeHidden();
    await expect(theme).toBeFocused();

    await page.keyboard.press(' ');
    await expect(light).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(submenu).toBeHidden();
    await expect(userMenu).toBeVisible();
    await expect(theme).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(light).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(dark).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(userMenu).toBeHidden();
    await expect(avatar).toBeFocused();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await avatar.click();
    await theme.click();
    await expect(dark).toHaveAttribute('aria-checked', 'true');
    await expect(light).toHaveAttribute('aria-checked', 'false');
    await clickSubmenuItem(page, light);
    await expect(userMenu).toBeHidden();
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
  });
});
