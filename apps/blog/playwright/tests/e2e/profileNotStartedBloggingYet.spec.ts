
import { expect, test } from '@playwright/test';
import { ProfilePage } from '../support/pages/profilePage';

// Run these tests until @ganda started blogging
test.describe('Profile page of @ganda', () => {
    let profilePage: ProfilePage;

    test.beforeEach(async ({ page }) => {
      profilePage = new ProfilePage(page);
    });

    test('profile Blog tab of @ganda is loaded', async ({ page }) => {
      await profilePage.gotoProfilePage('@ganda');
      // Validate URL of page is "http://.../@ganda"
      await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
      // Validate profile stats - new design uses separate number and label elements
      await expect(profilePage.profileStats.getByText("Followers")).toBeVisible();
      await expect(profilePage.profileStats.getByText("Posts")).toBeVisible();
      await expect(profilePage.profileStats.getByText("Following")).toBeVisible();
      await expect(profilePage.profileStats.getByText("HP")).toBeVisible();
    });

    test('profile Blog tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.profileBlogTabIsSelected();
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText("Looks like @ganda hasn't started blogging yet!");
    });

    test('profile Posts - Posts tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToPostsTab();
        await profilePage.profilePostsTabIsSelected();
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText("Looks like @ganda hasn't made any posts yet!");
    });

    test('profile Posts - Comments tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToPostsTab();
        await profilePage.profilePostsTabIsSelected();
        await profilePage.postsMenuCommentsButton.click();
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toBeVisible({ timeout: 15000 });
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText("Looks like @ganda hasn't made any posts yet!");
    });

    test('profile Posts - Payouts tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToPostsTab();
        await profilePage.profilePostsTabIsSelected();
        await profilePage.postsMenuPayoutsButton.click();
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toBeVisible({ timeout: 15000 });
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText("No pending payouts.");
    });

    test('profile Replies tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToRepliesTab();
        await profilePage.profileRepliesTabIsSelected();
        await expect(profilePage.userHasNotStartedBloggingYetMsg).toHaveText("@ganda hasn't had any replies yet.");
    });

    test('profile Social tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToSocialTab();
        await profilePage.profileSocialTabIsSelected();
        await expect(profilePage.socialCommunitySubscriptionsLabel).toHaveText("Community Subscriptions");
        await expect(profilePage.socialCommunitySubscriptionsDescription).toHaveText("The author has subscribed to the following Hive Communities");
        await expect(profilePage.userDoesNotHaveAnySubscriptionsYetMsg).toHaveText("Welcome! You don't have any subscriptions yet.");
        await expect(profilePage.socialBadgesAchivementsLabel).toHaveText("Badges and achievements");
        // Text varies based on REACT_APP_ENABLE_THIRD_PARTY_API flag - just check visibility
        await expect(profilePage.socialBadgesAchivementsDescription).toBeVisible();
    });

    test('profile Notifications tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToNotificationsTab();
        await profilePage.profileNotificationsTabIsSelected();
        await expect(profilePage.userHasNotHadAnyNotificationsYetMsg).toHaveText("@ganda hasn't had any notifications yet.");
    });
});
