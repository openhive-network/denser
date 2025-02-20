import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { VotingSlider } from '../support/pages/votingSlider';

test.describe('Test for slider voting', () => {
  test.describe('Upvote group', () => {
    test('Validate setting upvote slider of the first post to 1%', async ({ denserAutoTest3Page }) => {
      const percentageValueofSlider: string = '1%';
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
        1,
        1,
        100
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(percentageValueofSlider);
    });

    test('Validate setting upvote slider of the second post to 100%', async ({ denserAutoTest3Page }) => {
      const percentageValueofSlider: string = '100%';
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
        100,
        1,
        100
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(percentageValueofSlider);
    });

    test('Validate setting upvote slider of the third post to 73%', async ({ denserAutoTest3Page }) => {
      const percentageValueofSlider: string = '73%';
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
        73,
        1,
        100
      );
      await votingSlider.validateUpvotePercentageValueOfSlider(percentageValueofSlider);
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
