import { test, expect, Locator } from '../../fixtures';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { users } from '../support/loginHelper';
import { waitForElementVisible } from '../support/utils';

test.describe('Test for commonities in the blog app', () => {
    const communityName: string = 'Photography Lovers';

    test('Validate that denserAutoTest3Page subscribes Photography Lovers', async ({ denserAutoTest3Page }) => {
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        await expect(photographyLoversCommunityLocator).toHaveRole("link");
    });

    test('Validate that denserAutoTest3Page moves to the Photography Lovers page', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const communityPage: CommunitiesPage = new CommunitiesPage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        await photographyLoversCommunityLocator.click();

        await communityPage.quickValidataCommunitiesPageIsLoaded(communityName);
        await expect(communityPage.communityNameTitle).toHaveText(communityName);
        // JoindedLeave content means that user subscribes that community
        await expect(communityPage.communityJoinedLeaveButton).toHaveText('JoinedLeave');
        // The community contains posts
        await expect(communityPage.getFirstPostListItem).toBeVisible();
        // The community has a pinned post
        await expect(communityPage.communityPinnedPost).toBeVisible();
        // Joined button text is blue
        expect(
            await homePage.getElementCssPropertyValue(communityPage.communityJoinedLeaveButton, 'color')
          ).toBe('rgb(37, 99, 235)'); // blue
        // Leave button text is red after hovering
        await communityPage.communityJoinedLeaveButton.hover();
        await communityPage.page.waitForTimeout(1000);
        expect(
            await homePage.getElementCssPropertyValue(communityPage.communityJoinedLeaveButton, 'color')
          ).toBe('rgb(218, 43, 43)'); // red
        await communityPage.communityJoinedLeaveButton.blur();
    });

    test('Validate that denserAutoTest3Page leaves and joins the Photography Lovers community', async ({ denserAutoTest3Page }) => {
        const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
        const communityPage: CommunitiesPage = new CommunitiesPage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        // Validate the Photography Lovers link is in My subscriptions
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        await photographyLoversCommunityLocator.click();
        // Validate the Photography Lovers is loaded
        await communityPage.quickValidataCommunitiesPageIsLoaded(communityName);
        // JoindedLeave content means that user subscribes that community
        await expect(communityPage.communityJoinedLeaveButton).toHaveText('JoinedLeave');
        await communityPage.communityJoinedLeaveButton.click();
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        // Wait until optimistic ui is finished
        await waitForElementVisible(denserAutoTest3Page.page, communityPage.communitySubscribeButton['_selector'],20000, 4000);
        // Validate thet Joined button changed to Subscribe button
        await expect(communityPage.communitySubscribeButton).toBeVisible();
        await expect(communityPage.communitySubscribeButton).toHaveText('Subscribe');
        await expect(photographyLoversCommunityLocator).not.toBeVisible();
        // Click subscribe button
        await communityPage.communitySubscribeButton.click();
        await communityPage.page.waitForTimeout(2000);
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        // Wait until optimistic ui is finished
        await waitForElementVisible(denserAutoTest3Page.page, communityPage.communityJoinedLeaveButton['_selector'], 30000, 3000);
        // JoindedLeave content means that user subscribes that community
        await expect(communityPage.communityJoinedLeaveButton).toHaveText('JoinedLeave');
    });

    test('Validate creating a post in the subscribed community (Photography Lovers)', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
        const communityPage: CommunitiesPage = new CommunitiesPage(denserAutoTest3Page.page);
        const postEditorPage: PostEditorPage = new PostEditorPage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        // Move to the page of the community (Photography Lovers)
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        await photographyLoversCommunityLocator.click();
        // Validate the community page is loaded
        await communityPage.quickValidataCommunitiesPageIsLoaded(communityName);
        await expect(communityPage.communityNameTitle).toHaveText(communityName);
        // Click New post button
        await communityPage.communityNewPostButton.click();
        // If a password to unlock key is needed
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword)
        // Validate the post editor is open and create simple post
        const timestamp: string = new Date().toString();
        const postTitle: string = `Test community post ${timestamp}`;
        const postContentText: string = 'Content of the testing post POM';
        const postSummary: string = 'My testing post POM';
        const postTag: string = 'test';
        await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
        await expect(await communityPage.communityNameTitle).toHaveText(communityName);
        // Wait until optimistic ui is finished
        await waitForElementVisible(denserAutoTest3Page.page, communityPage.page.getByText(postTitle)['_selector'],20000, 4000);
        // Validate the new post was created
        await expect(communityPage.page.getByText(postTitle)).toBeVisible();
    });

    test('Validate creating a post in a community not subscribed (Blank Wizard)', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
        const communityPage: CommunitiesPage = new CommunitiesPage(denserAutoTest3Page.page);
        const postEditorPage: PostEditorPage = new PostEditorPage(denserAutoTest3Page.page);
        const unsubscribedCommunityName: string = 'Blank wizard';
        const blankWizardCommunityUrl: string = '/trending/hive-100001';

        await homePage.gotoSpecificUrl(blankWizardCommunityUrl);
        await communityPage.quickValidataCommunitiesPageIsLoaded(unsubscribedCommunityName);
        await expect(communityPage.communityNameTitle).toHaveText(unsubscribedCommunityName);
        // Click New post button
        await communityPage.communityNewPostButton.click();
        // If a password to unlock key is needed
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword)
        // Validate the post editor is open and create simple post
        const timestamp: string = new Date().toString();
        const postTitle: string = `Test unsubscribed community post ${timestamp}`;
        const postContentText: string = 'Content of the testing post';
        const postSummary: string = 'My testing post';
        const postTag: string = 'test';
        await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
        await postEditorPage.page.waitForTimeout(1000);
        // If a password to unlock key is needed
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        await communityPage.page.waitForTimeout(3000);
        await expect(await communityPage.communityNameTitle).toHaveText(unsubscribedCommunityName);
        // Wait until optimistic ui is finished
        await waitForElementVisible(denserAutoTest3Page.page, communityPage.page.getByText(postTitle)['_selector'],20000, 4000);
        // Validate the new post was created
        await expect(communityPage.page.getByText(postTitle)).toBeVisible();
    });

});
