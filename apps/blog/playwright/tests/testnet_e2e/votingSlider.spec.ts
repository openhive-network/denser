import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';

test.describe('Test for slider voting', () => {
    test.describe('Upvote group', () => {
        test('Upvote the first post by 30%', async ({denserAutoTest3Page}) => {
            const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
            const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);

            const firstPostUpvoteButtonLocator: Locator = homePage.getFirstPostUpvoteButtonIcon;
            const firstPostUpvoteButtonLocatorToClick: Locator = homePage.getFirstPostUpvoteButton;

            const getUpvoteSliderThumb: Locator = denserAutoTest3Page.page.locator('[data-testid="upvote-slider-thumb"]');
            const getUpveteSliderPercentageValue: Locator = denserAutoTest3Page.page.locator('[data-testid="upvote-slider-percentage-value"]');

            await firstPostUpvoteButtonLocatorToClick.click();
            await expect(getUpvoteSliderThumb).toBeVisible();
        });
    });
});

