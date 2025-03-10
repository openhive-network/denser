import { Locator, Page, expect } from '@playwright/test';
import { HomePage } from './pages/homePage';
import { LoginForm } from './pages/loginForm';
import { ProfileUserMenu } from './pages/profileUserMenu';


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
    await this.loginFormDefaut.page.waitForTimeout(5000);
    await this.homePage.profileAvatarButton.click();
    // Validate User is logged in
    await this.page.waitForSelector(this.profileMenu.profileMenuContent['_selector']);
    await this.profileMenu.validateUserProfileManuIsOpen();
    await this.profileMenu.validateUserNameInProfileMenu(username);
    await this.profileMenu.clickCloseProfileMenu();
  }

  async validateLoggedInUser(username: string){
    // Click avatar of the user
    await this.homePage.profileAvatarButton.click();
    // Validate User is logged in
    await this.page.waitForSelector(this.profileMenu.profileMenuContent['_selector']);
    await this.profileMenu.validateUserProfileManuIsOpen();
    await this.profileMenu.validateUserNameInProfileMenu(username);
  }
}
