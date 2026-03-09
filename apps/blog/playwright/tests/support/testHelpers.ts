import { expect, test, Page } from '@playwright/test';
import { PostEditorPage } from './pages/postEditorPage';
import { LoginForm } from './pages/loginForm';
import { HomePage } from './pages/homePage';

/**
 * Skip test if not running on Chromium.
 * Visual/screenshot tests are only reliable on a single browser engine.
 */
export function chromiumOnly(browserName: string) {
  test.skip(browserName !== 'chromium', 'Visual test runs on chromium only');
}

/**
 * Type assertion helper that narrows null/undefined to a definite value.
 * Uses Playwright's expect() so failures produce clear test messages.
 */
export function assertDefined<T>(val: T | null | undefined, msg: string): asserts val is T {
  expect(val, msg).not.toBeNull();
}

/**
 * Log in via the default login form and navigate to the post editor.
 *
 * Requires CI_TEST_USER and CI_TEST_USER_WIF_POSTING env vars.
 * Call `skipWithoutCredentials()` in a `test.beforeAll` / describe-level
 * `test.skip` before using this helper.
 */
export async function loginAndOpenEditor(page: Page) {
  const homePage = new HomePage(page);
  const loginForm = new LoginForm(page);
  const postEditorPage = new PostEditorPage(page);

  const username = process.env.CI_TEST_USER;
  const wifPosting = process.env.CI_TEST_USER_WIF_POSTING;

  if (!username || !wifPosting) {
    throw new Error(
      'loginAndOpenEditor requires CI_TEST_USER and CI_TEST_USER_WIF_POSTING environment variables'
    );
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(homePage.getNavCreatePost).toBeVisible({ timeout: 30000 });
  await homePage.getNavCreatePost.click();
  await loginForm.validateDefaultLoginFormIsLoaded();
  await loginForm.usernameInput.fill(username);
  await loginForm.passwordInput.fill('testtest');
  await loginForm.wifInput.fill(wifPosting);
  await loginForm.saveSignInButton.click();
  await expect(postEditorPage.getPostTitleInput).toBeVisible({ timeout: 30000 });

  return { homePage, loginForm, postEditorPage };
}

/**
 * Returns true when CI_TEST_USER and CI_TEST_USER_WIF_POSTING are set.
 * Use with `test.skip(() => !hasEditorCredentials(), '...')`.
 */
export function hasEditorCredentials(): boolean {
  return !!process.env.CI_TEST_USER && !!process.env.CI_TEST_USER_WIF_POSTING;
}
