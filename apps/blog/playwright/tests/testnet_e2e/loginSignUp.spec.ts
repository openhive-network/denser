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
  test('Sign In to the Denser App', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(users.denserautotest1.username);
    await loginFormDefaut.passwordInput.fill(users.denserautotest1.safeStoragePassword);
    await console.log('111 ', users.denserautotest1.keys.private_posting);

    await loginFormDefaut.wifInput.fill(users.denserautotest1.keys.private_posting); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest2.username);
  });

  test('Sign In to the Denser App 2', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(users.denserautotest2.username);
    await loginFormDefaut.passwordInput.fill(users.denserautotest2.safeStoragePassword);
    await console.log('222 ', users.denserautotest2.keys.private_posting);

    await loginFormDefaut.wifInput.fill(users.denserautotest2.keys.private_posting); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest3.username);
  });

  test('Sign In to the Denser App  and upvote first post', async ({page}) =>{
    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);

    await homePage.loginBtn.click()
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // Sign In
    await loginFormDefaut.usernameInput.fill(users.denserautotest2.username);
    await loginFormDefaut.passwordInput.fill(users.denserautotest2.safeStoragePassword);
    await console.log('222 ', users.denserautotest2.keys.private_posting);

    await loginFormDefaut.wifInput.fill(users.denserautotest2.keys.private_posting); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest2.username);

    //
    await homePage.getUpvoteButton.first().click();
    await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    await loginFormDefaut.passwordToUnlockKeyInput.fill(users.denserautotest2.safeStoragePassword);
    await loginFormDefaut.passwordToUnlockKeySubmitButton.click();
  });
});
