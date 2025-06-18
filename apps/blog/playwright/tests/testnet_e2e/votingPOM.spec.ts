import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { LoginHelper, users } from '../support/loginHelper';
import { ApiHelper } from '../support/apiHelper';
import { waitForElementColor, waitForElementVisible } from '../support/utils';

test.describe('Voting tests with fixture and POM', () =>{
  const url: string = process.env.REACT_APP_API_ENDPOINT || "";
  // Upvotes and downvotes colors
  const lightModeRedColor: string = 'rgb(218, 43, 43)';
  const lightModeWhiteColor: string = 'rgb(255, 255, 255)';
  const lightModeClearColor: string = 'rgba(0, 0, 0, 0)';
  const lightModeGreyColor: string = 'rgb(75, 85, 99)';
  const darkModeRedColor: string = 'rgb(226, 18, 53)';
  const darkModeWhiteColor: string = 'rgb(255, 255, 255)';
  const darkModeClearColor: string = 'rgba(0, 0, 0, 0)';
  const darkModeGreyColor: string = 'rgb(75, 85, 99)';
  // Upvotes and downvotes tooltip texts
  const upvoteTooltipText: string = 'UpvoteUpvote';
  const undoUpvoteTooltipText: string = 'Undo your upvoteUndo your upvote';
  const downvoteTooltipText: string = 'DownvoteDownvote';
  const undoDownvoteTooltipText: string = 'Undo your downvoteUndo your downvote';

  let homePage: HomePage;

  test.beforeEach(async ({ denserAutoTest4Page }) => {
    homePage = new HomePage(denserAutoTest4Page.page);

    await homePage.goto();
  });

  test.describe('Upvote group', () => {
    test('Upvote the first post of the tranding list', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);

      const firstPostUpvoteButtonLocator = homePage.getFirstPostUpvoteButtonIcon;
      const firstPostUpvoteButtonLocatorToClick = homePage.getFirstPostUpvoteButton;

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == lightModeRedColor){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
        // Validate the upvote tooltips
        await firstPostUpvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(upvoteTooltipText);
      } else {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
        // Validate the upvote tooltips
        await firstPostUpvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(undoUpvoteTooltipText);
      }
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == lightModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);

        await firstPostUpvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(undoUpvoteTooltipText);
      } else {
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);

        await firstPostUpvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(upvoteTooltipText);
      }
    });

    test('Upvote the first post of the tranding list again', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Validate that Upvote button of the first color red
      const firstPostUpvoteButtonLocator = homePage.getFirstPostUpvoteButtonIcon;
      const firstPostUpvoteButtonLocatorToClick = homePage.getFirstPostUpvoteButton;

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == lightModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
      } else {
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
      }
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      // Move pointer from the upvote icon - click the main post list's header element
      await profileMenu.clickCloseProfileMenu();
      // await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({force: true});

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == lightModeRedColor){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
      } else {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await firstPostUpvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
      }
    });

    test('Validate request body after clicking upvote button of the first post of the tranding list', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const apiHelper = new ApiHelper(denserAutoTest4Page.page);

      // Set first post upvote button locators
      const firstPostUpvoteButtonLocator = homePage.getFirstPostUpvoteButtonIcon;
      const firstPostUpvoteButtonLocatorToClick = homePage.getFirstPostUpvoteButton;
      // wait for the broadcast transaction
      const broadcastTransaction = apiHelper.waitForRequestToIntercept(url, "POST", "network_broadcast_api.broadcast_transaction");
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});

      // wait for promise to resolve intercepted request
      const broadcastTransactionReq = await broadcastTransaction;
      await denserAutoTest4Page.page.waitForTimeout(10000);
      const broadcastTransactionReqJson = await broadcastTransactionReq.postDataJSON();
      // console.log('operations >>>: ', await broadcastTransactionReqJson.params.trx.operations);
      // If now color of the upvote button is read
      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == lightModeRedColor) {
        // it means that request was for 'Undo your upvote'
        expect(await broadcastTransactionReqJson.params.trx.operations[0].type).toBe('vote_operation');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe('denserautotest4');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.author).toBe('dollarvigilante');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(0);
      } else {
        // it meand that request was for 'Upvote'
        expect(await broadcastTransactionReqJson.params.trx.operations[0].type).toBe('vote_operation');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe('denserautotest4');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.author).toBe('dollarvigilante');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(10000);
      }
    });

    test('Upvote the first post of the tranding list in the dark theme', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      const firstPostUpvoteButtonLocator = homePage.getFirstPostUpvoteButtonIcon;
      const firstPostUpvoteButtonLocatorToClick = homePage.getFirstPostUpvoteButton;

      // Set the dark theme
      await profileMenu.setTheme('Dark');
      await profileMenu.page.waitForTimeout(500);

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == darkModeRedColor){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      } else {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      }
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == darkModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      } else {
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      }
    });

    test('Upvote the first post of the tranding list again in the dark theme', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Validate that Upvote button of the first color red
      const firstPostUpvoteButtonLocator = homePage.getFirstPostUpvoteButtonIcon;
      const firstPostUpvoteButtonLocatorToClick = homePage.getFirstPostUpvoteButton;

      // Set the dark theme
      await profileMenu.setTheme('Dark');
      await profileMenu.page.waitForTimeout(500);

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == darkModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      } else {
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      }
      // Click Upvote button of the first post on the trending list
      await firstPostUpvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      // Move pointer from the upvote icon - click the main post list's header element
      await profileMenu.clickCloseProfileMenu();

      if (await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color') == darkModeRedColor){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      } else {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostUpvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      }
    });
  });

  test.describe('Downvote group', () => {
    test('Downvote the second post of the tranding list', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);

      // Validate that Downvote button of the first color
      const secondPostDownvoteButtonLocator = homePage.getSecondPostDownvoteButtonIcon;
      const secondPostDownvoteButtonLocatorToClick = homePage.getSecondPostDownvoteButton;

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == lightModeGreyColor){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
        // Validate the downvote tooltip text
        await secondPostDownvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getDownvoteButtonTooltip.textContent()).toBe(downvoteTooltipText);
      } else {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
        // Validate the undo downvote tooltip text
        await secondPostDownvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getDownvoteButtonTooltip.textContent()).toBe(undoDownvoteTooltipText);
      }
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      await loginForm.page.waitForTimeout(2000);
      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == lightModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
        // Validate the undo downvote tooltip text
        await secondPostDownvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getDownvoteButtonTooltip.textContent()).toBe(undoDownvoteTooltipText);
      } else {
        // Validate that Downvote button of the second post has color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
        // Validate the downvote tooltip text
        await secondPostDownvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getDownvoteButtonTooltip.textContent()).toBe(downvoteTooltipText);
      }
    });

    test('Downvote the second post of the tranding list again', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Get the second downvote button locator
      const secondPostDownvoteButtonLocator = homePage.getSecondPostDownvoteButtonIcon;
      const secondPostDownvoteButtonLocatorToClick = homePage.getSecondPostDownvoteButton;

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == lightModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
      } else {
        // Validate that Downvote button of the second post is color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
      }
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      // Move pointer from the upvote icon - click the main post list's header element
      await profileMenu.clickCloseProfileMenu();

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == lightModeGreyColor){
        // Validate that Downvote button of the second post is color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
      } else {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        await secondPostDownvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
      }
    });

    test('Validate request body after clicking downvote button of the second post of the tranding list', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const apiHelper = new ApiHelper(denserAutoTest4Page.page);

      // Set second post downvote button locators
      const secondPostDownvoteButtonLocator = homePage.getSecondPostDownvoteButtonIcon;
      const secondPostDownvoteButtonLocatorToClick = homePage.getSecondPostDownvoteButton;
      // wait for the broadcast transaction
      const broadcastTransaction = apiHelper.waitForRequestToIntercept(url, "POST", "network_broadcast_api.broadcast_transaction");
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      await loginForm.page.waitForTimeout(2000);
      // wait for promise to resolve intercepted request
      const broadcastTransactionReq = await broadcastTransaction;
      await denserAutoTest4Page.page.waitForTimeout(10000);
      const broadcastTransactionReqJson = await broadcastTransactionReq.postDataJSON();
      // console.log('operations >>>: ', await broadcastTransactionReqJson.params.trx.operations);
      // If now color of the downvote button is grey
      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == lightModeGreyColor) {
        // it means that request was for 'Undo your downvote'
        expect(await broadcastTransactionReqJson.params.trx.operations[0].type).toBe('vote_operation');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe('denserautotest4');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.author).toBe('curie');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(0);
      } else {
        // it meand that request was for 'Upvote'
        expect(await broadcastTransactionReqJson.params.trx.operations[0].type).toBe('vote_operation');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe('denserautotest4');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.author).toBe('curie');
        expect(await broadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(-10000);
      }
    });

    test('Downvote the second post of the tranding list in the dark theme', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Validate that Downvote button of the first color
      const secondPostDownvoteButtonLocator = homePage.getSecondPostDownvoteButtonIcon;
      const secondPostDownvoteButtonLocatorToClick = homePage.getSecondPostDownvoteButton;

      // Set the dark theme
      await profileMenu.setTheme('Dark');
      await profileMenu.page.waitForTimeout(500);

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == darkModeGreyColor){
        // Validate that Upvote button of the first color red
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      } else {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      }
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      await loginForm.page.waitForTimeout(2000);
      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == darkModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the upvote button
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      } else {
        // Validate that Downvote button of the second post has color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      }
    });

    test('Downvote the second post of the tranding list in the dark theme again', async ({denserAutoTest4Page}) =>{
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const profileMenu = new ProfileUserMenu(denserAutoTest4Page.page);

      // Get the second downvote button locator
      const secondPostDownvoteButtonLocator = homePage.getSecondPostDownvoteButtonIcon;
      const secondPostDownvoteButtonLocatorToClick = homePage.getSecondPostDownvoteButton;

      // Set the dark theme
      await profileMenu.setTheme('Dark');
      await profileMenu.page.waitForTimeout(500);

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == darkModeWhiteColor) {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      } else {
        // Validate that Downvote button of the second post is color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      }
      // Click Downvote button of the second post on the trending list
      await secondPostDownvoteButtonLocatorToClick.click({force: true});
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
      // Move pointer from the upvote icon - click the main post list's header element
      await profileMenu.clickCloseProfileMenu();

      if (await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color') == darkModeGreyColor){
        // Validate that Downvote button of the second post is color grey
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeGreyColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeClearColor);
      } else {
        // Wait until optimistic ui is finished and validate the color of the downvote button
        await denserAutoTest4Page.page.waitForSelector(".circle__Wrapper-sc-16bbsoy-0",{state: 'detached'});
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'color')).toBe(darkModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(secondPostDownvoteButtonLocator, 'background-color')).toBe(darkModeRedColor);
      }
    });
  });
});
