import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { users } from '../support/loginHelper';

test.describe('Login and Sign Up tests', () =>{
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);

    await homePage.goto();
  });

  // -- Happy path for Login
  // Use denserautotest1 user
  test('Sign In to the Denser App', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(users.denserautotest1.username);
    await loginFormDefaut.passwordInput.fill(users.denserautotest1.safeStoragePassword);
    await loginFormDefaut.wifInput.fill(users.denserautotest1.keys.private_posting); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest1.username);
  });

  // Use denserautotest2 user
  test('Sign In to the Denser App by another user', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(users.denserautotest2.username);
    await loginFormDefaut.passwordInput.fill(users.denserautotest2.safeStoragePassword);
    await loginFormDefaut.wifInput.fill(users.denserautotest2.keys.private_posting); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest2.username);
  });
});
