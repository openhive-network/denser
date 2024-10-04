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
    await loginFormDefaut.wifInput.fill(users.denserautotest1.keys.private_posting); // Posting Key
    await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest2.username);
  });

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
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest3.username);
  });

  test.describe.serial('Upvote group', () => {

    test('Upvote the first post of the tranding list', async ({page}) =>{
      const loginFormDefaut = new LoginForm(page);
      const profileMenu = new ProfileUserMenu(page);

      await homePage.loginBtn.click()
      await loginFormDefaut.validateDefaultLoginFormIsLoaded();
      // Sign In
      await loginFormDefaut.usernameInput.fill(users.denserautotest4.username);
      await loginFormDefaut.passwordInput.fill(users.denserautotest4.safeStoragePassword);
      await loginFormDefaut.wifInput.fill(users.denserautotest4.keys.private_posting); // Posting Key
      await loginFormDefaut.saveSignInButton.click();
      await homePage.profileAvatarButton.click();
      // Validate User is logged in
      await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
      await profileMenu.validateUserProfileManuIsOpen();
      await profileMenu.validateUserNameInProfileMenu(users.denserautotest4.username);
      // Click to close the profile menu
      await page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // Validate that Upvote button of the first color red
      const firstPostUpvoteButtonLocator = page.getByTestId('post-list-item').first().getByTestId('upvote-button').locator('svg');
      const firstPostUpvoteButtonLocatorToClick = page.getByTestId('post-list-item').first().getByTestId('upvote-button');
      // console.log('1 first upvote color: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color'));
      // console.log('1 first upvote bg: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color'));
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 0, 0)');
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      if (await loginFormDefaut.enterYourPasswordForm.isVisible()) {
        await loginFormDefaut.passwordToUnlockKeyInput.fill(users.denserautotest4.safeStoragePassword);
        await loginFormDefaut.passwordToUnlockKeySubmitButton.click();
        console.log('denserautotest4 ', users.denserautotest4.safeStoragePassword)
      }
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});
      // console.log('2 first upvote color: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color'));
      // console.log('2 first upvote bg: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color'));
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
    });

    test('Upvote the first post of the tranding list again', async ({page}) =>{
      const loginFormDefaut = new LoginForm(page);
      const profileMenu = new ProfileUserMenu(page);

      await homePage.loginBtn.click()
      await loginFormDefaut.validateDefaultLoginFormIsLoaded();
      // Sign In
      await loginFormDefaut.usernameInput.fill(users.denserautotest4.username);
      await loginFormDefaut.passwordInput.fill(users.denserautotest4.safeStoragePassword);
      await loginFormDefaut.wifInput.fill(users.denserautotest4.keys.private_posting); // Posting Key
      await loginFormDefaut.saveSignInButton.click();
      await homePage.profileAvatarButton.click();
      // Validate User is logged in
      await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
      await profileMenu.validateUserProfileManuIsOpen();
      await profileMenu.validateUserNameInProfileMenu(users.denserautotest4.username);
      // Click to close the profile menu
      await page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // Validate that Upvote button of the first color red
      const firstPostUpvoteButtonLocator = page.getByTestId('post-list-item').first().getByTestId('upvote-button').locator('svg');
      const firstPostUpvoteButtonLocatorToClick = page.getByTestId('post-list-item').first().getByTestId('upvote-button');
      // console.log('1 first upvote color: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color'));
      // console.log('1 first upvote bg: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color'));
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      if (await loginFormDefaut.enterYourPasswordForm.isVisible()) {
        await loginFormDefaut.passwordToUnlockKeyInput.fill(users.denserautotest4.safeStoragePassword);
        await loginFormDefaut.passwordToUnlockKeySubmitButton.click();
        console.log('denserautotest4 ', users.denserautotest4.safeStoragePassword)
      }
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});
      // Move pointer from the upvote icon
      await page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // console.log('2 first upvote color: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color'));
      // console.log('2 first upvote bg: ', await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color'));
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 0, 0)');
      expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    });
  });
});
