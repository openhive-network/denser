
import { Locator, expect, test } from '@playwright/test';
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
      await expect(profilePage.profileStats.getByText("7 followers")).toBeVisible();
      await expect(profilePage.profileStats.getByText("No posts")).toBeVisible();
      await expect(profilePage.profileStats.getByText("Not following anybody")).toBeVisible();
      await expect(profilePage.profileStats.getByText("0 HP")).toBeVisible();
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
        await expect(profilePage.userHasNotMadeAnyPostsYetMsg).toHaveText("Looks like @ganda hasn't made any posts yet!");
    });

    test('profile Posts - Comments tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToPostsTab();
        await profilePage.profilePostsTabIsSelected();
        await profilePage.postsMenuCommentsButton.click();
        await profilePage.page.waitForTimeout(1000);
        await expect(profilePage.userHasNotMadeAnyPostsYetMsg).toHaveText("Looks like @ganda hasn't made any posts yet!");
    });

    test('profile Posts - Payouts tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToPostsTab();
        await profilePage.profilePostsTabIsSelected();
        await profilePage.postsMenuPayoutsButton.click();
        await profilePage.page.waitForTimeout(1000);
        await expect(profilePage.userNoPendingPayoutsMsg).toHaveText("No pending payouts.");
    });

    test('profile Replies tab of @ganda is empty', async ({ page }) => {
        await profilePage.gotoProfilePage('@ganda');
        // Validate URL of page is "http://.../@ganda"
        await expect(profilePage.page).toHaveURL(/ *.\/@ganda$/);
        await profilePage.moveToRepliesTab();
        await profilePage.profileRepliesTabIsSelected();
        await expect(profilePage.userHasNotHadAnyRepliesYetMsg).toHaveText("@ganda hasn't had any replies yet.");
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
        await expect(profilePage.socialBadgesAchivementsDescription).toHaveText("These are badges received by the author via the third-party apps Peakd & Hivebuzz.");
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
