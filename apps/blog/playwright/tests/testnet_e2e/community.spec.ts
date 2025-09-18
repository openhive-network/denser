import { test, expect, Locator } from '../../fixtures';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { users } from '../support/loginHelper';
import { waitForCommunitySubscribeButton,
         waitForCommunityJoinedLeaveButton,
         waitForCommunityCreatedPost,
         waitForLifestyleCommunityJoinedLeaveButtonInCommunityExplorerPage,
         waitForLifestyleCommunitySubscribeButtonInCommunityExplorerPage,
         waitForLifestyleMySubscriptionsLink } from '../support/waitHelper';
import { CommunitiesExplorePage } from '../support/pages/communitiesExplorerPage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { MyFriendsPage } from '../support/pages/myFriendsPage';
import { MyCommunitiesPage } from '../support/pages/myCommunitiesPage';

test.describe('Test for commonities in the blog app', () => {
    const communityName: string = 'Photography Lovers';

    test('Validate that denserAutoTest3Page subscribes Photography Lovers', async ({ denserAutoTest3Page }) => {
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('ul').filter({ hasText: /^Photography Lovers$/ }).getByRole('link');

        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        await expect(photographyLoversCommunityLocator).toHaveRole("link");
    });

    test('Validate that denserAutoTest3Page moves to the Photography Lovers page', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const communityPage: CommunitiesPage = new CommunitiesPage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('ul').filter({ hasText: /^Photography Lovers$/ }).getByRole('link');

        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
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
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('ul').filter({ hasText: /^Photography Lovers$/ }).getByRole('link');

        // Validate the Photography Lovers link is in My subscriptions
        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        await photographyLoversCommunityLocator.click();
        // Validate the Photography Lovers is loaded
        await communityPage.page.waitForTimeout(2000);
        await communityPage.quickValidataCommunitiesPageIsLoaded(communityName);
        // JoindedLeave content means that user subscribes that community
        await communityPage.page.waitForTimeout(2000);
        await expect(communityPage.communityJoinedLeaveButton).toHaveText('JoinedLeave');
        await communityPage.communityJoinedLeaveButton.click();
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        // Wait until optimistic ui is finished - waiting for subscribe button
        await waitForCommunitySubscribeButton(denserAutoTest3Page.page);
        // Validate thet Joined button changed to Subscribe button
        await expect(communityPage.communitySubscribeButton).toBeVisible();
        await expect(communityPage.communitySubscribeButton).toHaveText('Subscribe');
        await expect(photographyLoversCommunityLocator).not.toBeVisible();
        // Click subscribe button
        await communityPage.communitySubscribeButton.click();
        await communityPage.page.waitForTimeout(2000);
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        // Wait until optimistic ui is finished - waiting for joined button
        await waitForCommunityJoinedLeaveButton(denserAutoTest3Page.page);
        // JoindedLeave content means that user subscribes that community
        await communityPage.page.waitForTimeout(3000);
        await expect(communityPage.communityJoinedLeaveButton).toHaveText('JoinedLeave');
    });

    test('Validate creating a post in the subscribed community (Photography Lovers)', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
        const communityPage: CommunitiesPage = new CommunitiesPage(denserAutoTest3Page.page);
        const postEditorPage: PostEditorPage = new PostEditorPage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('ul').filter({ hasText: /^Photography Lovers$/ }).getByRole('link');

        // Move to the page of the community (Photography Lovers)
        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
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
        // Wait until optimistic ui is finished - waiting for created post by post title
        await waitForCommunityCreatedPost(denserAutoTest3Page.page, postTitle);
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
        // Wait until optimistic ui is finished - waiting for created post by post title
        await waitForCommunityCreatedPost(denserAutoTest3Page.page, postTitle);
        // Validate the new post was created
        await expect(communityPage.page.getByText(postTitle)).toBeVisible();
    });

    test('Validate that denserAutoTest3Page joins and leaves the new community by explore communities page', async ({ denserAutoTest3Page }) => {
        const loginForm: LoginForm = new LoginForm(denserAutoTest3Page.page);
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const communityExplorerPage: CommunitiesExplorePage = new CommunitiesExplorePage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        // Validate the Photography Lovers link is in My subscriptions
        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        // Click Explore communities...
        await denserAutoTest3Page.page.getByText('Explore communities...').click();
        // Validate the Explore communities page i loaded
        await communityExplorerPage.validataExplorerCommunitiesPageIsLoaded();
        // Click Lifestyle subscribe button
        await communityExplorerPage.getLifestyleCommunityButton.click();
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        // Wait until optimistic ui is finished - Subscribe button shouled change to Joined button
        // await waitForLifestyleCommunityJoinedLeaveButtonInCommunityExplorerPage(denserAutoTest3Page.page);
        await communityExplorerPage.getLifestyleCommunityButton.waitFor({ state: 'visible' });
        // JoindedLeave content means that user subscribes that community
        await communityExplorerPage.page.waitForTimeout(3000);
        await expect(communityExplorerPage.getLifestyleCommunityButton).toHaveText('JoinedLeave');
        // Validate that name of subscribed community is displaying on the My communities list (Lifestyle)
        await waitForLifestyleMySubscriptionsLink(denserAutoTest3Page.page);
        await expect(homePage.getLifestyleCommunityLink).toBeVisible();
        // Click Lifestyle community leave this community
        await communityExplorerPage.getLifestyleCommunityButton.click();
        await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest3.safeStoragePassword);
        // Wait until optimistic ui is finished - Joined button shouled change to Subscribe button
        await communityExplorerPage.getLifestyleCommunityButton.waitFor({ state: 'visible' });
        await communityExplorerPage.page.waitForTimeout(3000);
        // await waitForLifestyleCommunitySubscribeButtonInCommunityExplorerPage(denserAutoTest3Page.page);
        await expect(communityExplorerPage.getLifestyleCommunityButton).toHaveText('Subscribe');
        // Validate that name of subscribed community is not displaying on the My communities list (Lifestyle)
        await expect(homePage.getLifestyleCommunityLink).not.toBeVisible();
    });

    test('Validate styles community card in explore communities page', async ({ denserAutoTest3Page }) => {
        const communityExplorerPage: CommunitiesExplorePage = new CommunitiesExplorePage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        // Validate the Photography Lovers link is in My subscriptions
        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        // Click Explore communities...
        await denserAutoTest3Page.page.getByText('Explore communities...').click();
        // Validate the Explore communities page i loaded
        await communityExplorerPage.validataExplorerCommunitiesPageIsLoaded();
        // Validate the community title's color
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityTitle, "color")).toBe('rgb(218, 43, 43)');
        // Validate the community description color
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.communityListItemAbout.first(), "color")).toBe('rgb(24, 30, 42)');
        // Validate the community card footer color
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.communityListItemFooter.first(), "color")).toBe('rgb(24, 30, 42)');
        // Validate the Admin Link color
        await expect(communityExplorerPage.communityListItemFooterAdminLink.first()).toHaveText('denserautotest4');
        // Validate Subscribe button styles of Lifestyle community
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "color")).toBe('rgb(248, 250, 252)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "background-color")).toBe('rgb(37, 99, 235)');
        // Validate Subscribe button styles of Lifestyle community after hovering
        await communityExplorerPage.getLifestyleCommunityButton.hover();
        await communityExplorerPage.page.waitForTimeout(1000);
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "color")).toBe('rgb(248, 250, 252)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "background-color")).toBe('rgb(29, 78, 216)');
        await communityExplorerPage.getLifestyleCommunityButton.blur();
        // Validate Joined button styles of Photography Lovers community
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "color")).toBe('rgb(37, 99, 235)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "background-color")).toBe('rgba(0, 0, 0, 0)');
        // Validate Joined button styles of Photography Lovers community after hovering
        await communityExplorerPage.getPhotographyLoversCommunityButton.hover();
        await communityExplorerPage.page.waitForTimeout(1000);
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "color")).toBe('rgb(218, 43, 43)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "background-color")).toBe('rgba(0, 0, 0, 0)');
        await communityExplorerPage.getPhotographyLoversCommunityButton.blur();
        // Validate Create a Community link style
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getCreateACommunityLink, "color")).toBe('rgb(220, 38, 38)');
    });

    test('Validate styles community card in explore communities page in the dark theme', async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const profileMenu: ProfileUserMenu = new ProfileUserMenu(denserAutoTest3Page.page);
        const communityExplorerPage: CommunitiesExplorePage = new CommunitiesExplorePage(denserAutoTest3Page.page);
        const photographyLoversCommunityLocator: Locator = denserAutoTest3Page.page.locator('[href="/trending/hive-100006"]');

        // Change theme to Dark
        await profileMenu.setTheme('Dark');
        await profileMenu.page.waitForTimeout(500);
        await homePage.validateThemeModeIsDark();
        // Validate the Photography Lovers link is in My subscriptions
        await denserAutoTest3Page.page.waitForSelector(photographyLoversCommunityLocator['_selector']);
        await expect(photographyLoversCommunityLocator).toHaveText(communityName);
        // Click Explore communities...
        await denserAutoTest3Page.page.getByText('Explore communities...').click();
        // Validate the Explore communities page i loaded
        await communityExplorerPage.validataExplorerCommunitiesPageIsLoaded();
        // Validate the community title's color
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityTitle, "color")).toBe('rgb(226, 18, 53)');
        // Validate the community description color
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.communityListItemAbout.first(), "color")).toBe('rgb(248, 250, 252)');
        // Validate the community card footer color
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.communityListItemFooter.first(), "color")).toBe('rgb(248, 250, 252)');
        // Validate the Admin Link color
        await expect(communityExplorerPage.communityListItemFooterAdminLink.first()).toHaveText('denserautotest4');
        // Validate Subscribe button styles of Lifestyle community
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "color")).toBe('rgb(248, 250, 252)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "background-color")).toBe('rgb(37, 99, 235)');
        // Validate Subscribe button styles of Lifestyle community after hovering
        await communityExplorerPage.getLifestyleCommunityButton.hover();
        await communityExplorerPage.page.waitForTimeout(1000);
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "color")).toBe('rgb(248, 250, 252)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getLifestyleCommunityButton, "background-color")).toBe('rgb(29, 78, 216)');
        await communityExplorerPage.getLifestyleCommunityButton.blur();
        // Validate Joined button styles of Photography Lovers community
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "color")).toBe('rgb(37, 99, 235)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "background-color")).toBe('rgba(0, 0, 0, 0)');
        // Validate Joined button styles of Photography Lovers community after hovering
        await communityExplorerPage.getPhotographyLoversCommunityButton.hover();
        await communityExplorerPage.page.waitForTimeout(1000);
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "color")).toBe('rgb(226, 18, 53)');
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getPhotographyLoversCommunityButton, "background-color")).toBe('rgba(0, 0, 0, 0)');
        await communityExplorerPage.getPhotographyLoversCommunityButton.blur();
        // Validate Create a Community link style
        expect(await communityExplorerPage.getElementCssPropertyValue(communityExplorerPage.getCreateACommunityLink, "color")).toBe('rgb(220, 38, 38)');
    });

    test("Move to the My friends page", async ({ denserAutoTest3Page }) => {
        const myFriendsPage: MyFriendsPage = new MyFriendsPage(denserAutoTest3Page.page);

        // Move to the My friends page
        await myFriendsPage.myFriendsLink.click();
        // Validate the My friends page is loaded
        await myFriendsPage.validateMyFriendsPage();
    });

    test("Move to the My friends page and click explore trending", async ({ denserAutoTest3Page }) => {
        const homePage: HomePage = new HomePage(denserAutoTest3Page.page);
        const myFriendsPage: MyFriendsPage = new MyFriendsPage(denserAutoTest3Page.page);

        // Move to the My friends page
        await myFriendsPage.myFriendsLink.click();
        // Validate the My friends page is loaded
        await myFriendsPage.validateMyFriendsPage();
        // Click Explore Trending
        await myFriendsPage.exploreTrendingLink.click();
        // Validate the All posts page is loaded
        await homePage.validateAllPostspageIsLoaded();
    });

    test("Move to the My communities page", async ({ denserAutoTest3Page }) => {
        const myCommunitiesPage: MyCommunitiesPage = new MyCommunitiesPage(denserAutoTest3Page.page);

        // Click My Communities link
        await myCommunitiesPage.myCommunitiesLink.click();
        // Validate the my communities page is loaded
        await myCommunitiesPage.validateMyCommunitiesPage();
    });
});
