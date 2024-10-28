import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { LoginHelper, users } from '../support/loginHelper';

test.describe('Voting tests with fixture and POM', () =>{
  let homePage: HomePage;

  test.beforeEach(async ({ denserAutoTest4Page }) => {
    homePage = new HomePage(denserAutoTest4Page.page);

    await homePage.goto();
  });

  test.describe('Upvote group', () => {
    test('Upvote the first post of the tranding list', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);

      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // Validate that Upvote button of the first color
      const firstPostUpvoteButtonLocator = denserAutoTest4Page.page.getByTestId('post-list-item').first().getByTestId('upvote-button').locator('svg');
      const firstPostUpvoteButtonLocatorToClick = denserAutoTest4Page.page.getByTestId('post-list-item').first().getByTestId('upvote-button');
      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == 'rgb(255, 0, 0)'){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 0, 0)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      } else {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      }
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == 'rgb(255, 255, 255)') {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      } else {
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 0, 0)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('Upvote the first post of the tranding list again', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // Validate that Upvote button of the first color red
      const firstPostUpvoteButtonLocator = denserAutoTest4Page.page.getByTestId('post-list-item').first().getByTestId('upvote-button').locator('svg');
      const firstPostUpvoteButtonLocatorToClick = denserAutoTest4Page.page.getByTestId('post-list-item').first().getByTestId('upvote-button');

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == 'rgb(255, 255, 255)') {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      } else {
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 0, 0)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      }
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});
      // Move pointer from the upvote icon
      await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == 'rgb(255, 0, 0)'){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 0, 0)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      } else {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      }
    });
  });

  test.describe('Downvote group', () => {
    test('Downvote the second post of the tranding list', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);

      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // Validate that Downvote button of the first color
      const secondPostDownvoteButtonLocator = denserAutoTest4Page.page.getByTestId('post-list-item').nth(1).getByTestId('downvote-button').locator('svg');
      const secondPostDownvoteButtonLocatorToClick = denserAutoTest4Page.page.getByTestId('post-list-item').nth(1).getByTestId('downvote-button');
      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == 'rgb(75, 85, 99)'){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(75, 85, 99)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      } else {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        await secondPostDownvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      }
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await secondPostDownvoteButtonLocator.waitFor({state: 'visible'});
      await loginForm.page.waitForTimeout(2000);
      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == 'rgb(255, 255, 255)') {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      } else {
        // Validate that Downvote button of the second post has color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(75, 85, 99)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('Downvote the second post of the tranding list again', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});
      // Get the second downvote button locator
      const secondPostDownvoteButtonLocator = denserAutoTest4Page.page.getByTestId('post-list-item').nth(1).getByTestId('downvote-button').locator('svg');
      const secondPostDownvoteButtonLocatorToClick = denserAutoTest4Page.page.getByTestId('post-list-item').nth(1).getByTestId('downvote-button');

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == 'rgb(255, 255, 255)') {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      } else {
        // Validate that Downvote button of the second post is color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(75, 85, 99)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      }
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await secondPostDownvoteButtonLocator.waitFor({state: 'visible'});
      // Move pointer from the upvote icon
      await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == 'rgb(75, 85, 99)'){
        // Validate that Downvote button of the second post is color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(75, 85, 99)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      } else {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        await secondPostDownvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe('rgb(255, 0, 0)');
      }
    });
  });
});
