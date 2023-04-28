import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';

test.describe('Profile page of @gtg', () => {
  test('url of the profile page @gtg is correct', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    // Validate URL of page is "http://.../@gtg"
    await expect(profilePage.page).toHaveURL(/ *.\/@gtg$/);
  });

  test('profile info of @gtg is loaded', async ({ page, request }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileInfoIsVisible(
      '@gtg',
      'Gandalf the Grey',
      'IT Wizard, Hive Witness',
      'Joined June 2016'
    );

    const url = process.env.NEXT_PUBLIC_API_NODE_ENDPOINT;

    // Compare profile api nickname with nickname displayed on the website
    // and number of posts
    const responseGetAccounts = await request.post(`https://${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [['gtg']]
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const profileNameApi = (await responseGetAccounts.json()).result[0].name;
    await expect(profilePage.profileNickName).toHaveText('@' + profileNameApi);

    const profilePostCountApi = (await responseGetAccounts.json()).result[0].post_count;
    expect(await profilePage.profileNumberOfPosts.textContent()).toBe(String(profilePostCountApi));

    // Compare follower and following number from api to the respondent on the website
    const responseGetFollowCount = await request.post(`https://${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'condenser_api.get_follow_count',
        params: ['gtg']
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const followerCount = (await responseGetFollowCount.json()).result.follower_count;
    const followingCount = (await responseGetFollowCount.json()).result.following_count;

    await expect(profilePage.profileFollowers).toHaveText(String(followerCount));
    await expect(profilePage.profileFollowing).toHaveText(String(followingCount));
  });

  test('profile navigation of @gtg is loaded', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileNavigationIsVisible();
  });

  test('profile feed tab of @gtg is loaded', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileFeedTabIsSelected();
  });

  test('move to Posts Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profilePostsTabIsNotSelected();
    await profilePage.moveToPostsTab();
  });

  test('move to Replies Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileRepliesTabIsNotSelected();
    await profilePage.moveToRepliesTab();
  });

  test('move to Social Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSocialTabIsNotSelected();
    await profilePage.moveToSocialTab();
  });

  test('move to Peakd by link in Social Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSocialTabIsNotSelected();
    await profilePage.moveToSocialTab();
    await profilePage.moveToPeakdByLinkInSocialTab();
  });

  test('move to Hivebuzz by link in Social Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSocialTabIsNotSelected();
    await profilePage.moveToSocialTab();
    await profilePage.moveToHivebuzzByLinkInSocialTab();
  });

  test('move to Notifications Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsNotSelected();
    await profilePage.moveToNotificationsTab();
  });

  test('move to Wallet Page', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.moveToWalletPage();
  });

  test('move to Settings Tab', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSettingsTabIsNotSelected();
    await profilePage.moveToSettingsTab();
  });

  test('move to Settings Tab and validate public profile settings form is visible', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSettingsTabIsNotSelected();
    await profilePage.moveToSettingsTab();

    await expect(profilePage.publicProfileSettingsHeader).toHaveText('Public Profile Settings');
    await expect(profilePage.ppsProfilePictureUrlLabel).toHaveText('Profile picture url');
    await expect(profilePage.ppsProfilePictureUrlInput).toBeVisible();
    await expect(profilePage.ppsCoverImageUrlLabel).toHaveText('Cover image url (Optimal: 2048 x 512 px)');
    await expect(profilePage.ppsCoverImageUrlInput).toBeVisible();
    await expect(profilePage.ppsDisplayNameLabel).toHaveText('Display Name');
    await expect(profilePage.ppsDisplayNameInput).toBeVisible();
    await expect(profilePage.ppsAboutLabel).toHaveText('About');
    await expect(profilePage.ppsAboutInput).toBeVisible();
    await expect(profilePage.ppsLocationLabel).toHaveText('Location');
    await expect(profilePage.ppsLocationInput).toBeVisible();
    await expect(profilePage.ppsWebsiteLabel).toHaveText('Website');
    await expect(profilePage.ppsWebsiteInput).toBeVisible();
    await expect(profilePage.ppsBlacklistDescriptionLabel).toHaveText('Blacklist Description');
    await expect(profilePage.ppsBlacklistDescriptionInput).toBeVisible();
    await expect(profilePage.ppsMuteListDescriptionLabel).toHaveText('Mute List Description');
    await expect(profilePage.ppsMuteListDescriptionInput).toBeVisible();
    await expect(profilePage.ppsButtonUpdate).toHaveText('Update');
    await expect(profilePage.ppsButtonUpdate).toBeVisible();
  });

  test('move to Settings Tab and validate preferences settings form is visible', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSettingsTabIsNotSelected();
    await profilePage.moveToSettingsTab();

    await expect(profilePage.preferencesSettings).toBeVisible();
    await expect(profilePage.preferencesSettingsChooseLanguage).toBeVisible();
    await expect(profilePage.preferencesSettingsNoSafeForWorkContent).toBeVisible();
    await expect(profilePage.preferencesSettingsBlogPostRewards).toBeVisible();
    await expect(profilePage.preferencesSettingsCommentsPostRewards).toBeVisible();
    await expect(profilePage.preferencesSettingsReferralSystem).toBeVisible();
  });

  test('move to Settings Tab and validate advanced settings form is visible', async ({ page }) => {
    const profilePage = new ProfilePage(page);

    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSettingsTabIsNotSelected();
    await profilePage.moveToSettingsTab();

    await expect(profilePage.advancedProfileSettingsHeader).toBeVisible();
    await expect(profilePage.advancedSettingsApiEndpointRadioGroup).toBeVisible();
    expect((await profilePage.advancedSettingsApiEndpointList.all()).length).toBe(4);

    const expectedEndpoints: string[] = [
      'https://api.hive.blog',
      'https://rpc.ausbit.dev',
      'https://anyx.io',
      'https://api.deathwing.me'
    ];

    (await profilePage.advancedSettingsApiEndpointList.all()).forEach(async (element, index) => {
      expect(await element.textContent()).toBe(expectedEndpoints[index])
    })

    await expect(profilePage.advancedSettingsApiEndpointButton.first()).toBeChecked()
    expect(await profilePage.advancedSettingsApiEndpointButton.last().isChecked()).toBeFalsy()

    await expect(profilePage.advancedSettingsApiEndpointAddInput).toHaveAttribute('placeholder', 'Add API Endpoint')
    await expect(profilePage.advancedSettingsApiEndpointAddButton).toHaveText('Add')
    await expect(profilePage.advancedSettingsApiResetEndpointsButton).toBeVisible()
  });

  test('The Follow button changes color when you hover over it (Light theme)', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.gotoProfilePage('@gtg');

    expect(await profilePage.getElementCssPropertyValue(profilePage.followButton, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    expect(await profilePage.getElementCssPropertyValue(profilePage.followButton, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );

    await profilePage.followButton.hover();
    await profilePage.page.waitForTimeout(1000);

    expect(await profilePage.getElementCssPropertyValue(profilePage.followButton, 'color')).toBe(
      'rgb(255, 255, 255)'
    );
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.followButton, 'background-color')
    ).toBe('rgb(239, 68, 68)');
  });

  test('The Follow button changes color when you hover over it (Dark theme)', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    const homePage = new HomePage(page);

    await profilePage.gotoProfilePage('@gtg');

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    expect(await profilePage.getElementCssPropertyValue(profilePage.followButton, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    expect(await profilePage.getElementCssPropertyValue(profilePage.followButton, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );

    await profilePage.followButton.hover();
    await profilePage.page.waitForTimeout(1000);

    expect(await profilePage.getElementCssPropertyValue(profilePage.followButton, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.followButton, 'background-color')
    ).toBe('rgb(239, 68, 68)');
  });
});
