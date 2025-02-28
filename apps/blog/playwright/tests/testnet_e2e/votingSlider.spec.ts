import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { users } from '../support/loginHelper';
import { VotingSlider } from '../support/pages/votingSlider';
import { ApiHelper } from '../support/apiHelper';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';

test.describe('Test for slider voting', () => {
  const url: string = process.env.REACT_APP_API_ENDPOINT || '';
  test.describe('Upvote group', () => {
    const minValueOfDownvoteSlider: number = 1; // 1%
    const maxValueOfDownvoteSlider: number = 100; // 100%

    test('Validate setting upvote slider of the first post to 1%', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '1%';
      const setupValueOfSlider: number = 1; // 1%

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

      const firstPostUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;
      await firstPostUpvoteButtonLocatorToClick.click();
      // Validate that upvote button modal is visible
      await expect(votingSlider.upvoteSliderModal).toBeVisible();
      // Set slider to 1% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.upvoteSliderTrack,
        votingSlider.upvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
    });

    test('Validate setting upvote slider of the second post to 100%', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '100%';
      const setupValueOfSlider: number = 100; // 100%

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

      const secondPostUpvoteButtonLocatorToClick: Locator = homePage.getUpvoteButton.nth(1);
      await secondPostUpvoteButtonLocatorToClick.click();
      // Validate that upvote button modal is visible
      await expect(votingSlider.upvoteSliderModal).toBeVisible();
      // Set slider to 100% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.upvoteSliderTrack,
        votingSlider.upvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
    });

    test('Validate setting upvote slider of the third post to 73%', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '73%';
      const setupValueOfSlider: number = 73; // 73%

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

      const thirdPostUpvoteButtonLocatorToClick: Locator = homePage.getUpvoteButton.nth(2);
      await thirdPostUpvoteButtonLocatorToClick.click();
      // Validate that upvote button modal is visible
      await expect(votingSlider.upvoteSliderModal).toBeVisible();
      // Set slider to 73% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.upvoteSliderTrack,
        votingSlider.upvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
    });

    test('Upvote 34% for the first post and undo that voting', async ({ denserAutoTest3Page }) => {
      const lightModeRedColor: string = 'rgb(218, 43, 43)';
      const lightModeWhiteColor: string = 'rgb(255, 255, 255)';
      const lightModeClearColor: string = 'rgba(0, 0, 0, 0)';

      const expectedPercentageValueOfSlider: string = '34%';
      const setupValueOfSlider: number = 34; // 34%
      const undoUpvoteTooltipText: string = 'Undo your upvote 34.00%Undo your upvote 34.00%';
      const upvoteTooltipText: string = 'UpvoteUpvote';

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);
      const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);

      const firstPostCardUpvoteButtonLocator: Locator = homePage.firstPostCardUpvoteButtonLocator;
      const firstPostCardDownvoteButtonLocator: Locator = homePage.firstPostCardDownvoteButtonLocator;
      const firstPostCardUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;
      await firstPostCardUpvoteButtonLocatorToClick.click();
      // Validate that upvote button modal is visible
      await expect(votingSlider.upvoteSliderModal).toBeVisible();
      // Set slider to 34% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.upvoteSliderTrack,
        votingSlider.upvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
      // Click vote button
      await votingSlider.upvoteSliderButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await firstPostCardUpvoteButtonLocator.waitFor({ state: 'visible' });
      expect(await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'color')).toBe(
        lightModeWhiteColor
      );
      expect(
        await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'background-color')
      ).toBe(lightModeRedColor);
      // Validate tooltip text - `undo you upvote ...`
      await firstPostCardUpvoteButtonLocator.hover();
      await homePage.page.waitForTimeout(1000);
      expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(undoUpvoteTooltipText);
      // Click Upvote button again to undo the upvote your vote
      await firstPostCardUpvoteButtonLocatorToClick.click();
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await firstPostCardUpvoteButtonLocator.waitFor({ state: 'visible' });
      // Hovering the downvote button due to validate the real uncovered upvote button
      await firstPostCardDownvoteButtonLocator.hover();
      expect(await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'color')).toBe(
        lightModeRedColor
      );
      expect(
        await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'background-color')
      ).toBe(lightModeClearColor);
      // Hover the upvote button to validate the tooltip text
      await firstPostCardUpvoteButtonLocator.hover();
      await homePage.page.waitForTimeout(1000);
      expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(upvoteTooltipText);
    });

    test('Validate requests send during Upvote 27% for the first post and undo that voting', async ({
      denserAutoTest3Page
    }) => {
      const expectedPercentageValueOfSlider: string = '27%';
      const setupValueOfSlider: number = 27; // 27%
      const weightOfUpvote: number = 2700;
      const weightOfUndoUpvote: number = 0;
      const typeOperation: string = 'vote_operation';
      const voterName: string = users.denserautotest3.username;
      const firstPostAuthor: string = 'dollarvigilante';

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);
      const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
      const apiHelper: ApiHelper = new ApiHelper(denserAutoTest3Page.page);

      const firstPostCardUpvoteButtonLocator: Locator = homePage.firstPostCardUpvoteButtonLocator;
      const firstPostCardDownvoteButtonLocator: Locator = homePage.firstPostCardDownvoteButtonLocator;
      const firstPostCardUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;
      await firstPostCardUpvoteButtonLocatorToClick.click();

      // Upvote - first
      // wait for the broadcast transaction
      const broadcastTransaction = apiHelper.waitForRequestToIntercept(
        url,
        'POST',
        'network_broadcast_api.broadcast_transaction'
      );

      // Validate that upvote button modal is visible
      await expect(votingSlider.upvoteSliderModal).toBeVisible();
      // Set slider to 34% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.upvoteSliderTrack,
        votingSlider.upvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
      // Click vote button
      await votingSlider.upvoteSliderButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
      // Wait until optimistic ui is finished
      await firstPostCardUpvoteButtonLocator.waitFor({ state: 'visible' });
      // wait for promise to resolve intercepted request
      const broadcastTransactionReq = await broadcastTransaction;
      await denserAutoTest3Page.page.waitForTimeout(10000);
      const broadcastTransactionReqJson = await broadcastTransactionReq.postDataJSON();
      // console.log('operations >>>: ', await broadcastTransactionReqJson.params.trx.operations);
      // Validate request was for 'Upvote'
      expect(await broadcastTransactionReqJson.params.trx.operations[0].type).toBe(typeOperation);
      expect(await broadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe(voterName);
      expect(await broadcastTransactionReqJson.params.trx.operations[0].value.author).toBe(firstPostAuthor);
      expect(await broadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(weightOfUpvote);

      // Undo your upvote
      // wait for the broadcast transaction
      const undoYourUpvoteBroadcastTransaction = apiHelper.waitForRequestToIntercept(
        url,
        'POST',
        'network_broadcast_api.broadcast_transaction'
      );
      // Click Upvote button again to undo the upvote your vote
      await firstPostCardUpvoteButtonLocatorToClick.click();
      // Wait until optimistic ui is finished and validate the color of the upvote button
      await firstPostCardUpvoteButtonLocator.waitFor({ state: 'visible' });
      // wait for promise to resolve intercepted request
      const undoYourUpvoteBroadcastTransactionReq = await undoYourUpvoteBroadcastTransaction;
      await denserAutoTest3Page.page.waitForTimeout(10000);
      const undoYourUpvoteBroadcastTransactionReqJson =
        await undoYourUpvoteBroadcastTransactionReq.postDataJSON();
      // console.log('operations >>>: ', await undoYourUpvoteBroadcastTransactionReqJson.params.trx.operations);
      // Validate request was for 'undo your upvote'
      expect(await undoYourUpvoteBroadcastTransactionReqJson.params.trx.operations[0].type).toBe(
        typeOperation
      );
      expect(await undoYourUpvoteBroadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe(
        voterName
      );
      expect(await undoYourUpvoteBroadcastTransactionReqJson.params.trx.operations[0].value.author).toBe(
        firstPostAuthor
      );
      expect(await undoYourUpvoteBroadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(
        weightOfUndoUpvote
      );
    });

    test('Validate setting upvote slider css styles in white mode', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

        const firstPostUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;
        await firstPostUpvoteButtonLocatorToClick.click();
        // Validate that upvote button modal is visible
        await expect(votingSlider.upvoteSliderModal).toBeVisible();

        // Upvote slider modal
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderModal, 'color')).toBe('rgb(15, 23, 42)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderModal, 'background-color')).toBe('rgb(247, 247, 247)');
        // Upvote slider track
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderTrack, 'color')).toBe('rgb(15, 23, 42)');
        // Upvote slider handel
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderThumb, 'color')).toBe('rgb(15, 23, 42)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderThumb, 'background-color')).toBe('rgb(255, 255, 255)');
        // Upvote slider percentage value
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderPercentageValue, 'color')).toBe('rgb(15, 23, 42)');
        // Upvote slider button icon
        await votingSlider.upvoteSliderModal.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'color')).toBe('rgb(218, 43, 43)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'background-color')).toBe('rgba(0, 0, 0, 0)');
        // Upvote slider button icon after hover it
        await votingSlider.upvoteSliderButton.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'background-color')).toBe('rgb(218, 43, 43)');
      });

      test('Validate setting upvote slider css styles in dark mode', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);
        const profileMenu: ProfileUserMenu = new ProfileUserMenu(denserAutoTest3Page.page);

        // Set the dark theme
        await profileMenu.setTheme('Dark');
        await profileMenu.page.waitForTimeout(500);

        const firstPostUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;
        await firstPostUpvoteButtonLocatorToClick.click();

        // Validate that upvote button modal is visible
        await expect(votingSlider.upvoteSliderModal).toBeVisible();

        // Upvote slider modal
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderModal, 'color')).toBe('rgb(148, 163, 184)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderModal, 'background-color')).toBe('rgb(34, 38, 42)');
        // Upvote slider track
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderTrack, 'color')).toBe('rgb(148, 163, 184)');
        // Upvote slider handel
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderThumb, 'color')).toBe('rgb(148, 163, 184)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderThumb, 'background-color')).toBe('rgb(44, 48, 53)');
        // Upvote slider percentage value
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderPercentageValue, 'color')).toBe('rgb(148, 163, 184)');
        // Upvote slider button icon
        await votingSlider.upvoteSliderModal.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'color')).toBe('rgb(226, 18, 53)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'background-color')).toBe('rgba(0, 0, 0, 0)');
        // Upvote slider button icon after hover it
        await votingSlider.upvoteSliderButton.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.upvoteSliderButtonIcon, 'background-color')).toBe('rgb(226, 18, 53)');
      });
  });

  test.describe('Downvote group', () => {
    const minValueOfDownvoteSlider: number = 1; // -1%
    const maxValueOfDownvoteSlider: number = 100; // -100%
    const textIncludedInDownvoteDescription1: string = 'Common reasons';
    const textIncludedInDownvoteDescription2: string = 'Fraud or plagiarism';

    test('Validate setting downvote slider of the first post to -1%', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '-1%';
      const setupValueOfSlider: number = 1;
      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

      const firstPostDownvoteButtonLocatorToClick: Locator = homePage.getFirstPostDownvoteButton;
      await firstPostDownvoteButtonLocatorToClick.click();
      // Validate that downvote button modal is visible
      await expect(votingSlider.downvoteSliderModal).toBeVisible();
      await expect(await votingSlider.downvoteSliderDescriptionContent.textContent()).toContain(
        textIncludedInDownvoteDescription1
      );
      // Set slider to -1% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.downvoteSliderTrack,
        votingSlider.downvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateDownvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
    });

    test('Validate setting downvote slider of the second post to -100%', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '-100%';
      const setupValueOfSlider: number = 100;
      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

      const secondPostDownvoteButtonLocatorToClick: Locator = homePage.getDownvoteButton.nth(1);
      await secondPostDownvoteButtonLocatorToClick.click();
      // Validate that downvote button modal is visible
      await expect(votingSlider.downvoteSliderModal).toBeVisible();
      await expect(await votingSlider.downvoteSliderDescriptionContent.textContent()).toContain(
        textIncludedInDownvoteDescription1
      );
      // Set slider to -100% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.downvoteSliderTrack,
        votingSlider.downvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateDownvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
    });

    test('Validate setting downvote slider of the third post to -64%', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '-64%';
      const setupValueOfSlider: number = 64;
      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

      const thirdPostDownvoteButtonLocatorToClick: Locator = homePage.getDownvoteButton.nth(2);
      await thirdPostDownvoteButtonLocatorToClick.click();
      // Validate that downvote button modal is visible
      await expect(votingSlider.downvoteSliderModal).toBeVisible();
      await expect(await votingSlider.downvoteSliderDescriptionContent.textContent()).toContain(
        textIncludedInDownvoteDescription2
      );
      // Set slider to -100% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.downvoteSliderTrack,
        votingSlider.downvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateDownvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
    });

    test('Downvote -25% for the first post and undo that voting', async ({ denserAutoTest3Page }) => {
      const lightModeRedColor: string = 'rgb(218, 43, 43)';
      const lightModeWhiteColor: string = 'rgb(255, 255, 255)';
      const lightModeClearColor: string = 'rgba(0, 0, 0, 0)';
      const lightModeGreyColor: string = 'rgb(75, 85, 99)';

      const expectedPercentageValueOfSlider: string = '-25%';
      const setupValueOfSlider: number = 25; // -25%
      const undoDownvoteTooltipText: string = 'Undo your downvote 25.00%Undo your downvote 25.00%';
      const downvoteTooltipText: string = 'DownvoteDownvote';

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);
      const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);

      const firstPostCardUpvoteButtonLocator: Locator = homePage.firstPostCardUpvoteButtonLocator;
      const firstPostCardDownvoteButtonLocator: Locator = homePage.firstPostCardDownvoteButtonLocator;
      const firstPostDownvoteButtonLocatorToClick: Locator = homePage.getFirstPostDownvoteButton;
      await firstPostDownvoteButtonLocatorToClick.click();
      // Validate that downvote button modal is visible
      await expect(votingSlider.downvoteSliderModal).toBeVisible();
      await expect(await votingSlider.downvoteSliderDescriptionContent.textContent()).toContain(
        textIncludedInDownvoteDescription1
      );
      // Set slider to -25% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.downvoteSliderTrack,
        votingSlider.downvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateDownvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
      // Click downvote button
      await votingSlider.downvoteSliderButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await firstPostCardDownvoteButtonLocator.waitFor({ state: 'visible' });
      expect(await homePage.getElementCssPropertyValue(firstPostCardDownvoteButtonLocator, 'color')).toBe(
        lightModeWhiteColor
      );
      expect(
        await homePage.getElementCssPropertyValue(firstPostCardDownvoteButtonLocator, 'background-color')
      ).toBe(lightModeGreyColor);
      // Hovering the upvote button due to validate the real uncovered downvote button after voting
      await firstPostCardUpvoteButtonLocator.hover();
      expect(await homePage.getElementCssPropertyValue(firstPostCardDownvoteButtonLocator, 'color')).toBe(
        lightModeWhiteColor
      );
      expect(
        await homePage.getElementCssPropertyValue(firstPostCardDownvoteButtonLocator, 'background-color')
      ).toBe(lightModeRedColor);
      // Validate tooltip text - `undo you downvote ...`
      await firstPostCardDownvoteButtonLocator.hover();
      await homePage.page.waitForTimeout(1000);
      expect(await homePage.getDownvoteButtonTooltip.textContent()).toBe(undoDownvoteTooltipText);
      // Click Downvote button again to undo the downvote your vote
      await firstPostDownvoteButtonLocatorToClick.click();
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await firstPostCardDownvoteButtonLocator.waitFor({ state: 'visible' });
      // Hovering the upvote button due to validate the real uncovered downvote button
      await firstPostCardUpvoteButtonLocator.hover();
      expect(await homePage.getElementCssPropertyValue(firstPostCardDownvoteButtonLocator, 'color')).toBe(
        lightModeGreyColor
      );
      expect(
        await homePage.getElementCssPropertyValue(firstPostCardDownvoteButtonLocator, 'background-color')
      ).toBe(lightModeClearColor);
      // Hover the downvote button to validate the tooltip text
      await firstPostCardDownvoteButtonLocator.hover();
      await homePage.page.waitForTimeout(1000);
      expect(await homePage.getDownvoteButtonTooltip.textContent()).toBe(downvoteTooltipText);
    });

    test('Downvote -77% for the first post and undo that voting', async ({ denserAutoTest3Page }) => {
      const expectedPercentageValueOfSlider: string = '-77%';
      const setupValueOfSlider: number = 77; // -77%
      const weightOfDownvote: number = -7700;
      const weightOfUndoDownvote: number = 0;
      const typeOperation: string = 'vote_operation';
      const voterName: string = users.denserautotest3.username;
      const firstPostAuthor: string = 'dollarvigilante';

      const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
      const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);
      const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
      const apiHelper: ApiHelper = new ApiHelper(denserAutoTest3Page.page);

      const firstPostCardUpvoteButtonLocator: Locator = homePage.firstPostCardUpvoteButtonLocator;
      const firstPostCardDownvoteButtonLocator: Locator = homePage.firstPostCardDownvoteButtonLocator;
      const firstPostDownvoteButtonLocatorToClick: Locator = homePage.getFirstPostDownvoteButton;
      await firstPostDownvoteButtonLocatorToClick.click();

      // Downvote - first
      // Wait for the broadcast transaction
      const broadcastTransaction = apiHelper.waitForRequestToIntercept(
        url,
        'POST',
        'network_broadcast_api.broadcast_transaction'
      );

      // Validate that downvote button modal is visible
      await expect(votingSlider.downvoteSliderModal).toBeVisible();
      await expect(await votingSlider.downvoteSliderDescriptionContent.textContent()).toContain(
        textIncludedInDownvoteDescription1
      );
      // Set slider to -77% (upvote slider from 1 to 100)
      await votingSlider.moveCustomSlider(
        votingSlider.downvoteSliderTrack,
        votingSlider.downvoteSliderThumb,
        setupValueOfSlider,
        minValueOfDownvoteSlider,
        maxValueOfDownvoteSlider
      );
      await votingSlider.validateDownvotePercentageValueOfSlider(expectedPercentageValueOfSlider);
      // Click downvote button
      await votingSlider.downvoteSliderButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(3000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await firstPostCardDownvoteButtonLocator.waitFor({ state: 'visible' });
      // Wait for promise to resolve intercepted request
      const broadcastTransactionReq = await broadcastTransaction;
      await denserAutoTest3Page.page.waitForTimeout(10000);
      const broadcastTransactionReqJson = await broadcastTransactionReq.postDataJSON();
      // console.log('operations >>>: ', await broadcastTransactionReqJson.params.trx.operations);
      // Validate request was for 'Downvote'
      expect(await broadcastTransactionReqJson.params.trx.operations[0].type).toBe(typeOperation);
      expect(await broadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe(voterName);
      expect(await broadcastTransactionReqJson.params.trx.operations[0].value.author).toBe(firstPostAuthor);
      expect(await broadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(weightOfDownvote);

      // Undo your downvote
      // Wait for the broadcast transaction
      const undoYourDownvoteBroadcastTransaction = apiHelper.waitForRequestToIntercept(
        url,
        'POST',
        'network_broadcast_api.broadcast_transaction'
      );
      // Click Downvote button again to undo the downvote your vote
      await firstPostDownvoteButtonLocatorToClick.click();
      // Wait until optimistic ui is finished and validate the color of the downvote button
      await firstPostCardDownvoteButtonLocator.waitFor({ state: 'visible' });
      // Wait for promise to resolve intercepted request
      const undoYourDownvoteBroadcastTransactionReq = await undoYourDownvoteBroadcastTransaction;
      await denserAutoTest3Page.page.waitForTimeout(10000);
      const undoYourDownvoteBroadcastTransactionReqJson =
        await undoYourDownvoteBroadcastTransactionReq.postDataJSON();
      // console.log('operations >>>: ', await undoYourDownvoteBroadcastTransactionReqJson.params.trx.operations);
      // Validate request was for 'Undo your downvote'
      expect(await undoYourDownvoteBroadcastTransactionReqJson.params.trx.operations[0].type).toBe(
        typeOperation
      );
      expect(await undoYourDownvoteBroadcastTransactionReqJson.params.trx.operations[0].value.voter).toBe(
        voterName
      );
      expect(await undoYourDownvoteBroadcastTransactionReqJson.params.trx.operations[0].value.author).toBe(
        firstPostAuthor
      );
      expect(await undoYourDownvoteBroadcastTransactionReqJson.params.trx.operations[0].value.weight).toBe(
        weightOfUndoDownvote
      );
    });

    test('Validate setting downvote slider css styles in white mode', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

        const firstPostDownvoteButtonLocatorToClick: Locator = homePage.getFirstPostDownvoteButton;
        await firstPostDownvoteButtonLocatorToClick.click();
        // Validate that Downvote button modal is visible
        await expect(votingSlider.downvoteSliderModal).toBeVisible();

        // Downvote slider modal
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderModal, 'color')).toBe('rgb(15, 23, 42)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderModal, 'background-color')).toBe('rgb(247, 247, 247)');
        // Downvote slider track
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderTrack, 'color')).toBe('rgb(15, 23, 42)');
        // Downvote slider handel
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderThumb, 'color')).toBe('rgb(15, 23, 42)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderThumb, 'background-color')).toBe('rgb(255, 255, 255)');
        // Downvote slider percentage value
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderPercentageValue, 'color')).toBe('rgb(218, 43, 43)');
        // Downvote slider button icon
        await votingSlider.downvoteSliderModal.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'color')).toBe('rgb(75, 85, 99)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'background-color')).toBe('rgba(0, 0, 0, 0)');
        // Downvote slider button icon after hover it
        await votingSlider.downvoteSliderButton.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'background-color')).toBe('rgb(75, 85, 99)');
      });

      test('Validate setting downvote slider css styles in dark mode', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);
        const profileMenu: ProfileUserMenu = new ProfileUserMenu(denserAutoTest3Page.page);

        // Set the dark theme
        await profileMenu.setTheme('Dark');
        await profileMenu.page.waitForTimeout(500);

        const firstPostDownvoteButtonLocatorToClick: Locator = homePage.getFirstPostDownvoteButton;
        await firstPostDownvoteButtonLocatorToClick.click();

        // Validate that downvote button modal is visible
        await expect(votingSlider.downvoteSliderModal).toBeVisible();

        // Downvote slider modal
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderModal, 'color')).toBe('rgb(148, 163, 184)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderModal, 'background-color')).toBe('rgb(34, 38, 42)');
        // Downvote slider track
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderTrack, 'color')).toBe('rgb(148, 163, 184)');
        // Downvote slider handel
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderThumb, 'color')).toBe('rgb(148, 163, 184)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderThumb, 'background-color')).toBe('rgb(44, 48, 53)');
        // Downvote slider percentage value
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderPercentageValue, 'color')).toBe('rgb(226, 18, 53)');
        // Downvote slider button icon
        await votingSlider.downvoteSliderModal.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'color')).toBe('rgb(75, 85, 99)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'background-color')).toBe('rgba(0, 0, 0, 0)');
        // Downvote slider button icon after hover it
        await votingSlider.downvoteSliderButton.hover();
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'color')).toBe('rgb(255, 255, 255)');
        expect(await homePage.getElementCssPropertyValue(votingSlider.downvoteSliderButtonIcon, 'background-color')).toBe('rgb(75, 85, 99)');
      });
  });
});
