import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';
import { ApiHelper } from '../support/apiHelper';

// Skip annotation was added to these tests due to AxiosError with status code 500 in Peakd
// Sometimes badges are not loaded
// Run these tests again when we handle this error in Social Tab or when Peakd fix this bug.
// See:
// https://gitlab.syncad.com/hive/denser/-/wikis/Comparison-of-views-of-the-Denser-project-with-the-old-Hive-Blog
// Exception from the third side (i.e. PeakD)

test.describe.skip('Social tab in the profile page of @gtg', () => {
    let homePage: HomePage;
    let postPage: PostPage;
    let profilePage: ProfilePage;

    test.beforeEach(async ({ page }) => {
        homePage = new HomePage(page);
        postPage = new PostPage(page);
        profilePage = new ProfilePage(page);
    });

    test('social tab is loaded', async ({ page }) => {
        await profilePage.gotoSocialProfilePage('@gtg');
        await profilePage.profileSocialTabIsSelected();
        expect(await profilePage.socialCommunitySubscriptionsLabel).toHaveText('Community Subscriptions');
        expect(await profilePage.socialCommunitySubscriptionsDescription).toHaveText('The author has subscribed to the following Hive Communities');
        expect(await profilePage.socialAuthorSubscribedCommunitiesList).toBeVisible();
        expect(await profilePage.socialBadgesAchivementsLabel).toHaveText('Badges and achievements');
        expect(await profilePage.socialBadgesAchivementsDescription).toHaveText('These are badges received by the author via the third-party apps Peakd & Hivebuzz.');
        await profilePage.page.waitForSelector(await profilePage.socialBadgesAchievemntsMenuBar['_selector']);
        await expect(await profilePage.socialBadgesAchievemntsMenuBar).toBeVisible();
    });

    test('validate subscribed communities list', async ({ page }) => {
        let apiHelper = new ApiHelper(page);
        await profilePage.gotoSocialProfilePage('@gtg');
        await profilePage.profileSocialTabIsSelected();

        const resSubscribedCommunitiesAPI = await apiHelper.getSubscribedCommunitiesAPI('gtg');
        const listOfSubscribedCommunitiesAPI = await resSubscribedCommunitiesAPI.result;

        const listOfSubscribedCommunitiesUI = await profilePage.socialAuthorSubscribedCommunitiesListItem.all();

        // console.log('API list of subscribed communities:', await listOfSubscribedCommunitiesAPI);
        // console.log(' UI list of subscribed communities:', await listOfSubscribedCommunitiesUI);

        // Validate: Subscribed communities names, user role tags, affiliation tag
        let listOfSubscribedCommunitiesUITextContent: string;
        for (let i = 0; i < listOfSubscribedCommunitiesAPI.length; i++) {
            listOfSubscribedCommunitiesUITextContent = await listOfSubscribedCommunitiesUI[i].textContent();
            // console.log('111 ', await listOfSubscribedCommunitiesUITextContent.toLocaleLowerCase())
            expect(await listOfSubscribedCommunitiesUITextContent.toLocaleLowerCase())
                .toContain(await listOfSubscribedCommunitiesAPI[i][1].toLocaleLowerCase()); // Community name
            expect(await listOfSubscribedCommunitiesUITextContent.toLocaleLowerCase())
                .toContain(await listOfSubscribedCommunitiesAPI[i][2].toLocaleLowerCase()); // User role tag
            expect(await listOfSubscribedCommunitiesUITextContent.toLocaleLowerCase())
                .toContain(await listOfSubscribedCommunitiesAPI[i][3].toLocaleLowerCase()); // Affiliation Tag
        }
    });

    test('validate subscribed communities list styles in the light mode', async ({ page }) => {
        await profilePage.gotoSocialProfilePage('@gtg');
        await profilePage.profileSocialTabIsSelected();

        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesListItem.locator('a').first(), 'color'))
            .toBe('rgb(220, 38, 38)');
        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesRoleTag.first(), 'color'))
            .toBe('rgb(15, 23, 42)');
        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesAffiliationTag.first(), 'color'))
            .toBe('rgb(100, 116, 139)');
        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesAffiliationTag.first(), 'border-color'))
            .toBe('rgb(220, 38, 38)');
            expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesAffiliationTag.first(), 'background-color'))
            .toBe('rgba(0, 0, 0, 0)');
    });

    test('validate subscribed communities list styles in the dark mode', async ({ page }) => {
        await profilePage.gotoSocialProfilePage('@gtg');
        await profilePage.profileSocialTabIsSelected();

        await homePage.changeThemeMode('Dark');
        await homePage.validateThemeModeIsDark();

        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesListItem.locator('a').first(), 'color'))
            .toBe('rgb(220, 38, 38)');
        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesRoleTag.first(), 'color'))
            .toBe('rgb(225, 231, 239)');
        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesAffiliationTag.first(), 'color'))
            .toBe('rgb(100, 116, 139)');
        expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesAffiliationTag.first(), 'border-color'))
            .toBe('rgb(220, 38, 38)');
            expect(await profilePage.getElementCssPropertyValue(await profilePage.socialAuthorSubscribedCommunitiesAffiliationTag.first(), 'background-color'))
            .toBe('rgba(0, 0, 0, 0)');
    });

    test('validate badges and challenges for @gtg', async ({ page }) => {
        await profilePage.gotoSocialProfilePage('@gtg');
        await profilePage.profileSocialTabIsSelected();

        // Validate first and last badges in Badges MenuBar
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').first()).toHaveAttribute('alt', 'Hive Witness - Top 100');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').last()).toHaveAttribute('alt', 'Hive Witness - Top 20');
        // Validate first three badges in Activity MenuBar
        await profilePage.socialMenuBarActivity.click();
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').first()).toHaveAttribute('alt', 'First Post');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(1)).toHaveAttribute('alt', 'First Comment');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(2)).toHaveAttribute('alt', 'First Upvote');
        // Validate first three badges in Personal MenuBar
        await profilePage.socialMenuBarPersonal.click();
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').first()).toHaveAttribute('alt', '1 year on the Hive blockchain');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(1)).toHaveAttribute('alt', '2 years on the Hive blockchain');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(2)).toHaveAttribute('alt', '3 years on the Hive blockchain');
        // Validate first three badges in Meetups MenuBar
        await profilePage.socialMenuBarMeetups.click();
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').first()).toHaveAttribute('alt', 'TRF 2018');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(1)).toHaveAttribute('alt', 'TRF 2019');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(2)).toHaveAttribute('alt', 'AltspaceVR 2020 Meetings Contest');
        // Validate first three badges in Challenges MenuBar
        await profilePage.socialMenuBarChallenges.click();
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').first()).toHaveAttribute('alt', '2021-03');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(1)).toHaveAttribute('alt', '2020-08');
        await expect(await profilePage.socialBadgeAchivement.locator('a > img').nth(2)).toHaveAttribute('alt', '2021-09');
    });
});
