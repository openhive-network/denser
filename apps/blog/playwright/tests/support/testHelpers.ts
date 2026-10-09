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

const AFTER_PAYOUT_VOTE_NOTE = 'Voting on Content after their payout does not generate any new rewards';

/**
 * Matches the full text of a vote button tooltip: the label (e.g. 'Upvote'),
 * optionally followed by the note shown on posts past their payout.
 */
export function voteTooltipText(label: string): RegExp {
  return new RegExp(`^${label}(${AFTER_PAYOUT_VOTE_NOTE})?$`);
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

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // nav-pencil is server-rendered, so it is visible before hydration wires its
  // DialogLogin trigger. login-btn renders only on the client once the
  // logged-out state is known, so its visibility means the pencil is live.
  await expect(homePage.loginBtn).toBeVisible();
  await homePage.getNavCreatePost.click();
  await loginForm.validateDefaultLoginFormIsLoaded();
  await loginForm.usernameInput.fill(username);
  await loginForm.passwordInput.fill('testtest');
  await loginForm.wifInput.fill(wifPosting);
  await loginForm.saveSignInButton.click();

  // Sign-in stores the user in the query cache, which swaps the pencil's
  // DialogLogin for a plain link (closing the dialog), and the dialog's
  // onComplete pushes /submit.html. The editor form renders only once the
  // submit page reads a logged-in user, so each stage fails on its own.
  await expect(loginForm.loginDialog).toBeHidden();
  await expect(page).toHaveURL(/\/submit\.html(?:$|\?)/);
  await postEditorPage.validateDefaultPostEditorIsLoaded();

  return { homePage, loginForm, postEditorPage };
}

/**
 * Returns true when CI_TEST_USER and CI_TEST_USER_WIF_POSTING are set.
 * Use with `test.skip(() => !hasEditorCredentials(), '...')`.
 */
export function hasEditorCredentials(): boolean {
  return !!process.env.CI_TEST_USER && !!process.env.CI_TEST_USER_WIF_POSTING;
}
