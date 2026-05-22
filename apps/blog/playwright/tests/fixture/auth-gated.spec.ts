import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { MakePostWarningPage } from '../support/pages/makePostWarningPage';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';

/**
 * Auth-Gated Pages fixture tests — covers test plan section 1.9
 * "Auth-Gated Pages (Anonymous behaviour)".
 *
 * Scope: anonymous user, view/rendering verification only.
 * Confirms each auth-gated entry point either degrades gracefully
 * (login prompt / empty-state) or opens the proper auth dialog.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture -- auth-gated
 * Replay:  pnpm --filter @hive/blog test:fixture -- auth-gated
 */

test.use({ fixtureTestName: 'authGated' });

const ANON_PROFILE = '@hiveio';

test.describe('Auth-Gated Pages (1.9) — anonymous behaviour (fixture-based)', () => {
  // ── ANON-GATE-01 — Submit post page ─────────────────────────────────
  test.describe('ANON-GATE-01 Submit post page', () => {
    let makePostWarningPage: MakePostWarningPage;

    test.beforeEach(async ({ page }) => {
      makePostWarningPage = new MakePostWarningPage(page);
      await makePostWarningPage.goto();
    });

    test('lands on /submit.html with the login prompt visible (no crash)', async ({ page }) => {
      await expect(page).toHaveURL(/\/submit\.html$/);
      await makePostWarningPage.validateAnonymousLoginPromptVisible();
    });
  });

  // ── ANON-GATE-02 — Own-feed variant /trending/my ────────────────────
  test.describe('ANON-GATE-02 Own-feed variant (/trending/my)', () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
      homePage = new HomePage(page);
      await homePage.gotoTrendingMyAnonymous();
    });

    test('lands on /trending/my and shows the anonymous empty-state prompt', async ({ page }) => {
      await expect(page).toHaveURL(/\/trending\/my$/);
      await expect(homePage.myFeedEmptyStateAnonymous).toBeVisible();
    });
  });

  // ── ANON-GATE-03 — Notifications tab of any user ────────────────────
  test.describe('ANON-GATE-03 Notifications tab of any user', () => {
    let profilePage: ProfilePage;

    test.beforeEach(async ({ page }) => {
      profilePage = new ProfilePage(page);
      await profilePage.gotoNotificationsProfilePage(ANON_PROFILE);
    });

    test('page loads without auth error and exposes the notifications UI', async ({ page }) => {
      await expect(page).toHaveURL(/\/@hiveio\/notifications$/);
      await expect(profilePage.profileInfo).toBeVisible();

      const notificationsContentOrEmpty = profilePage.notificationsMenu.or(
        profilePage.userHasNotHadAnyNotificationsYetMsg
      );
      await expect(notificationsContentOrEmpty.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    });
  });

  // ── ANON-GATE-04 — Settings tab of any user ─────────────────────────
  test.describe('ANON-GATE-04 Settings tab of any user', () => {
    let profilePage: ProfilePage;

    test.beforeEach(async ({ page }) => {
      profilePage = new ProfilePage(page);
      await profilePage.gotoSettingsProfilePageAnonymous(ANON_PROFILE);
    });

    test('settings page renders the read-only container without crashing', async ({ page }) => {
      await expect(page).toHaveURL(/\/@hiveio\/settings$/);
      await expect(profilePage.profileInfo).toBeVisible();
      await expect(profilePage.publicProfileSettings).toBeVisible();
    });
  });

  // ── ANON-GATE-05 — Login dialog opens with all auth options ─────────
  test.describe('ANON-GATE-05 Login dialog opens', () => {
    let homePage: HomePage;
    let loginForm: LoginForm;

    test.beforeEach(async ({ page }) => {
      homePage = new HomePage(page);
      loginForm = new LoginForm(page);
      await page.goto('/trending', { waitUntil: 'domcontentloaded' });
      // The login button only mounts after client-side hydration (the header
      // renders a skeleton in its place during SSR), so waiting on it gives
      // us a hydration signal without coupling the test to the post timeline.
      await expect(homePage.loginBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    });

    test('clicking Login in the header opens the safe-storage login dialog', async () => {
      await expect(homePage.loginBtn).toBeVisible();
      await homePage.loginBtn.click();

      await expect(loginForm.loginDialog).toBeVisible();
      await expect(loginForm.usernameInput).toBeVisible();
      await expect(loginForm.passwordInput).toBeVisible();
      await expect(loginForm.saveSignInButton).toBeVisible();
      await expect(loginForm.otherSignInOptionsButton).toBeVisible();
    });

    test('"Other sign-in options" panel exposes the full list of auth methods', async () => {
      await homePage.loginBtn.click();
      await expect(loginForm.loginDialog).toBeVisible();

      await loginForm.otherSignInOptionsButton.click();
      await expect(loginForm.otherSignInOptionsDescription).toBeVisible();
      await expect(loginForm.otherSignInOptionsUsernameInput).toBeVisible();
      await expect(loginForm.hiveKeychainExtensionButton).toBeVisible();
      await expect(loginForm.signInWithWifButton).toBeVisible();
      await expect(loginForm.hiveAuthButton).toBeVisible();
      await expect(loginForm.hiveSignerButton).toBeVisible();
      await expect(loginForm.goBackButton).toBeVisible();
    });
  });

  // ── ANON-GATE-06 — Sign up button ───────────────────────────────────
  test.describe('ANON-GATE-06 Sign up button', () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
      homePage = new HomePage(page);
      await page.goto('/trending', { waitUntil: 'domcontentloaded' });
      // signupBtn (like loginBtn) only mounts after hydration, so it serves
      // as a reliable hydration signal here without depending on posts.
      await expect(homePage.signupBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    });

    test('sign up button is visible and points to the external signup page', async () => {
      await expect(homePage.signupBtn).toBeVisible();
      await expect(homePage.signupLink).toHaveAttribute('href', /signup\.hive\.io/);
    });
  });
});
