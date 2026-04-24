import { Page, expect } from '@playwright/test';
import { HomePage } from './pages/homePage';
import { LoginForm } from './pages/loginForm';
import { ProfileUserMenu } from './pages/profileUserMenu';

export interface HBAuthCredentials {
  username: string;
  safeStoragePassword: string;
  wifPosting: string;
}

/**
 * Perform the full HBAuth (safe-storage) login flow from the home page.
 *
 * Assumes the page is already navigated to the app root. Waits for the
 * login button, fills credentials, submits, dismisses the biometric
 * prompt if it appears, and resolves once the profile avatar is visible
 * (i.e. login succeeded).
 *
 * Usage:
 * ```ts
 * await page.goto('/', { waitUntil: 'commit' });
 * await loginViaHBAuth(page, { username, safeStoragePassword, wifPosting });
 * ```
 */
export async function loginViaHBAuth(
  page: Page,
  credentials: HBAuthCredentials
): Promise<void> {
  const homePage = new HomePage(page);
  const loginForm = new LoginForm(page);

  await expect(homePage.loginBtn).toBeVisible({ timeout: 30000 });
  await homePage.loginBtn.click();

  await loginForm.validateDefaultLoginFormIsLoaded();
  await loginForm.usernameInput.fill(credentials.username);
  await loginForm.passwordInput.fill(credentials.safeStoragePassword);
  await loginForm.wifInput.fill(credentials.wifPosting);
  await loginForm.saveSignInButton.click();

  await loginForm.dismissBiometricPromptIfPresent();

  // await expect(loginForm.loginDialog).toBeHidden({ timeout: 30000 });
  // await page.reload({ waitUntil: 'domcontentloaded' });
  // await expect(homePage.profileAvatarButton).toBeVisible({ timeout: 30000 });
}

/**
 * Read credentials for a fixture test user from `apps/blog/.env.local`.
 * Env var names follow the pattern `<USER>_WIF_POSTING` and
 * `<USER>_SAFE_STORAGE_PASSWORD` where `<USER>` is the uppercased username
 * (e.g. `GUEST4TEST2_WIF_POSTING`).
 */
export function getHBAuthCredentialsFromEnv(username: string): HBAuthCredentials {
  const envPrefix = username.toUpperCase().replace(/-/g, '_');
  const wifPosting = process.env[`${envPrefix}_WIF_POSTING`];
  const safeStoragePassword = process.env[`${envPrefix}_SAFE_STORAGE_PASSWORD`];

  if (!wifPosting || !safeStoragePassword) {
    throw new Error(
      `Missing ${envPrefix}_WIF_POSTING or ${envPrefix}_SAFE_STORAGE_PASSWORD env vars ` +
        `for user "${username}". Add them to apps/blog/.env.local.`
    );
  }

  return { username, safeStoragePassword, wifPosting };
}


export const users = {
  denserautotest0: {
    username: 'denserautotest0',
    safeStoragePassword: 'testtest',
    keys: {
      private_owner: process.env.DENSER_AUTO_TEST0_WIF_OWNER as string,
      private_active: process.env.DENSER_AUTO_TEST0_WIF_ACTIVE as string,
      private_posting: process.env.DENSER_AUTO_TEST0_WIF_POSTING as string,
      private_memo: process.env.DENSER_AUTO_TEST0_WIF_MEMO as string,
    }
  },

  denserautotest1: {
    username: 'denserautotest1',
    safeStoragePassword: 'testtest',
    keys: {
      private_owner: process.env.DENSER_AUTO_TEST1_WIF_OWNER as string,
      private_active: process.env.DENSER_AUTO_TEST1_WIF_ACTIVE as string,
      private_posting: process.env.DENSER_AUTO_TEST1_WIF_POSTING as string,
      private_memo: process.env.DENSER_AUTO_TEST1_WIF_MEMO as string,
    }
  },

  denserautotest2: {
    username: 'denserautotest2',
    safeStoragePassword: 'testtest',
    keys: {
      private_owner: process.env.DENSER_AUTO_TEST2_WIF_OWNER as string,
      private_active: process.env.DENSER_AUTO_TEST2_WIF_ACTIVE as string,
      private_posting: process.env.DENSER_AUTO_TEST2_WIF_POSTING as string,
      private_memo: process.env.DENSER_AUTO_TEST2_WIF_MEMO as string,
    }
  },

  denserautotest3: {
    username: 'denserautotest3',
    safeStoragePassword: 'testtest',
    keys: {
      private_owner: process.env.DENSER_AUTO_TEST3_WIF_OWNER as string,
      private_active: process.env.DENSER_AUTO_TEST3_WIF_ACTIVE as string,
      private_posting: process.env.DENSER_AUTO_TEST3_WIF_POSTING as string,
      private_memo: process.env.DENSER_AUTO_TEST3_WIF_MEMO as string,
    }
  },

  denserautotest4: {
    username: 'denserautotest4',
    safeStoragePassword: 'testtest',
    keys: {
      private_owner: process.env.DENSER_AUTO_TEST4_WIF_OWNER as string,
      private_active: process.env.DENSER_AUTO_TEST4_WIF_ACTIVE as string,
      private_posting: process.env.DENSER_AUTO_TEST4_WIF_POSTING as string,
      private_memo: process.env.DENSER_AUTO_TEST4_WIF_MEMO as string,
    }
  }
}

export class LoginHelper {
  readonly page: Page;
  readonly homePage: HomePage;
  readonly loginFormDefaut: LoginForm;
  readonly profileMenu: ProfileUserMenu;


  constructor (page: Page) {
    this.page = page;
    this.homePage = new HomePage(page);
    this.loginFormDefaut = new LoginForm(page);
    this.profileMenu = new ProfileUserMenu(page);
  }

  async login(username: string, safeStoragePassword: string, privatePostingKey: string){
    // Click Login button
    await this.homePage.loginBtn.click()
    await this.loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Login
    await this.loginFormDefaut.usernameInput.fill(username);
    await this.loginFormDefaut.passwordInput.fill(safeStoragePassword);
    await this.loginFormDefaut.wifInput.fill(privatePostingKey);
    await this.loginFormDefaut.saveSignInButton.click();

    await expect(this.loginFormDefaut.loginDialog).toBeHidden({ timeout: 30000 });
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.homePage.profileAvatarButton).toBeVisible({ timeout: 30000 });

    await this.homePage.profileAvatarButton.click();
    // Validate User is logged in
    await this.profileMenu.profileMenuContent.waitFor({ state: 'visible' });
    await this.profileMenu.validateUserProfileManuIsOpen();
    await this.profileMenu.validateUserNameInProfileMenu(username);
    await this.profileMenu.clickCloseProfileMenu();
  }

  async validateLoggedInUser(username: string){
    // Click avatar of the user
    await this.homePage.profileAvatarButton.click();
    // Validate User is logged in
    await this.profileMenu.profileMenuContent.waitFor({ state: 'visible' });
    await this.profileMenu.validateUserProfileManuIsOpen();
    await this.profileMenu.validateUserNameInProfileMenu(username);
  }
}
