import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginHelper, users } from '../support/loginHelper';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';

test.describe('Login and Sign Up tests', () =>{
  let homePage: HomePage;
  let loginHelper: LoginHelper;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginHelper = new LoginHelper(page);

    await homePage.goto();
  });

  test.use({ storageState: 'playwright/.auth/denserautotest0.json' });

  test('Sign In to the Denser App by denserautotest0 from storage', async ({page}) =>{
    let profileMenu = new ProfileUserMenu(page);
    // Validate User is logged in
    await homePage.profileAvatarButton.click();
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest0.username);
  });

  test.describe('Specific login', () => {
    // Reset storage
    test.use({ storageState: {cookies: [], origins: []}});
    // -- Happy path for Login
    // Use denserautotest1 user
    test('Sign In to the Denser App as denserautotest1', async ({page}) =>{
      await loginHelper.login(
        users.denserautotest1.username,
        users.denserautotest1.safeStoragePassword,
        users.denserautotest1.keys.private_posting
      );
    });

    // Use denserautotest2 user
    test('Sign In to the Denser App as denserautotest2', async ({page}) =>{
      await loginHelper.login(
        users.denserautotest2.username,
        users.denserautotest2.safeStoragePassword,
        users.denserautotest2.keys.private_posting
      );
    });
  });

  test('Sign In to the Denser App by denserautotest0 from storage again', async ({page}) =>{
    let profileMenu = new ProfileUserMenu(page);
    // Validate User is logged in
    await homePage.profileAvatarButton.click();
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest0.username);
  });
});
