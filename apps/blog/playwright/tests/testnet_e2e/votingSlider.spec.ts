import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { users } from '../support/loginHelper';
import { VotingSlider } from '../support/pages/votingSlider';

test.describe('Test for slider voting', () => {
  test.describe('Upvote group', () => {
    const minValueOfDownvoteSlider: number = 1;   // 1%
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
        const upvoteTooltipText: string = "UpvoteUpvote";

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
        await firstPostCardUpvoteButtonLocator.waitFor({state: 'visible'});
        expect(await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'color')).toBe(lightModeWhiteColor);
        expect(await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'background-color')).toBe(lightModeRedColor);
        // Validate tooltip text - `undo you upvote ...`
        await firstPostCardUpvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(undoUpvoteTooltipText);
        // Click Upvote button again to undo the upvote your vote
        await firstPostCardUpvoteButtonLocatorToClick.click();
        // Wait until optimistic ui is finished and validate the color of the upvote button
        await firstPostCardUpvoteButtonLocator.waitFor({state: 'visible'});
        // Hovering the downvote button due to validate the real uncovered upvote button
        await firstPostCardDownvoteButtonLocator.hover();
        expect(await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'color')).toBe(lightModeRedColor);
        expect(await homePage.getElementCssPropertyValue(firstPostCardUpvoteButtonLocator, 'background-color')).toBe(lightModeClearColor);
        // Hover the upvote button to validate the tooltip text
        await firstPostCardUpvoteButtonLocator.hover();
        await homePage.page.waitForTimeout(1000);
        expect(await homePage.getUpvoteButtonTooltip.textContent()).toBe(upvoteTooltipText);
      });
  });

  test.describe('Downvote group', () => {
    const minValueOfDownvoteSlider: number = 1; // -1%
    const maxValueOfDownvoteSlider: number = 100; // -100%
    const textIncludedInDownvoteDescription1: string = 'Common reasons';
    const textIncludedInDownvoteDescription2: string = 'Fraud or plagiarism';

    test('Validate setting downvote slider of the first post to -1%', async ({
      denserAutoTest3Page
    }) => {
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

    test('Validate setting downvote slider of the second post to -100%', async ({
      denserAutoTest3Page
    }) => {
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

    test('Validate setting downvote slider of the third post to -64%', async ({
      denserAutoTest3Page
    }) => {
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
  });
});
