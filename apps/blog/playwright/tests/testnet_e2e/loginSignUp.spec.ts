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

  // -- Happy path for Sign in, Logout and Login
  test.only('Sign In to the Denser App', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(users.denserautotest0.username);
    await loginFormDefaut.passwordInput.fill(users.denserautotest0.safeStoragePassword);
    await console.log('111 ', users.denserautotest0.keys.private_posting);
    await loginFormDefaut.wifInput.fill(users.denserautotest0.keys.private_posting); // Posting Key
    // await loginFormDefaut.saveSignInButton.click();
    // await homePage.profileAvatarButton.click();
    // // Validate User is logged in
    // await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    // await profileMenu.validateUserProfileManuIsOpen();
    // await profileMenu.validateUserNameInProfileMenu(users.denserautotest0.username);
  });

});
