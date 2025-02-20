import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { VotingSlider } from '../support/pages/votingSlider';

test.describe('Test for slider voting', () => {
    test.describe('Upvote group', () => {
        test('Validate setting upvote slider of the first post to 1%', async ({denserAutoTest3Page}) => {
            const percentageValueofSlider: string = '1%';
            const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
            const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

            const firstPostUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;
            await firstPostUpvoteButtonLocatorToClick.click();
            // Validate that upvote button modal is visible
            await expect(votingSlider.upvoteSliderModal).toBeVisible();
            // Set slider to 1% (upvote slider from 1 to 100)
            await votingSlider.moveCustomSlider(votingSlider.upvoteSliderTrack, votingSlider.upvoteSliderThumb, 1, 1, 100);
            await votingSlider.validatePercentageValueOfSlider(percentageValueofSlider);
        });

        test('Validate setting upvote slider of the second post to 100%', async ({denserAutoTest3Page}) => {
            const percentageValueofSlider: string = '100%';
            const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
            const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

            const secondPostUpvoteButtonLocatorToClick: Locator = homePage.getUpvoteButton.nth(1);
            await secondPostUpvoteButtonLocatorToClick.click();
            // Validate that upvote button modal is visible
            await expect(votingSlider.upvoteSliderModal).toBeVisible();
            // Set slider to 100% (upvote slider from 1 to 100)
            await votingSlider.moveCustomSlider(votingSlider.upvoteSliderTrack, votingSlider.upvoteSliderThumb, 100, 1, 100);
            await votingSlider.validatePercentageValueOfSlider(percentageValueofSlider);
        });

        test('Validate setting upvote slider of the third post to 73%', async ({denserAutoTest3Page}) => {
            const percentageValueofSlider: string = '73%';
            const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
            const votingSlider: VotingSlider = new VotingSlider(denserAutoTest3Page.page);

            const thirdPostUpvoteButtonLocatorToClick: Locator = homePage.getUpvoteButton.nth(2);
            await thirdPostUpvoteButtonLocatorToClick.click();
            // Validate that upvote button modal is visible
            await expect(votingSlider.upvoteSliderModal).toBeVisible();
            // Set slider to 73% (upvote slider from 1 to 100)
            await votingSlider.moveCustomSlider(votingSlider.upvoteSliderTrack, votingSlider.upvoteSliderThumb, 73, 1, 100);
            await votingSlider.validatePercentageValueOfSlider(percentageValueofSlider);
        });
    });
});

