import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { PostPage } from '../support/pages/postPage';

// Skip Profile page tests because those based on gtg profile and new view of the Denser.
test.describe('Profile page of @gtg', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
  });

  test('url of the profile page @gtg is correct', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    // Validate URL of page is "http://.../@gtg"
    await expect(profilePage.page).toHaveURL(/ *.\/@gtg$/);
  });

  test('profile info of @gtg is loaded', async ({ page, request }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileInfoIsVisible(
      '@gtg',
      'Gandalf the Grey (74)',
      'IT Wizard, Hive Witness',
      'Joined June 2016'
    );

    const url = process.env.REACT_APP_API_ENDPOINT;

    // Compare profile api nickname with nickname displayed on the website
    // and number of posts
    const responseGetAccounts = await request.post(`${url}/`, {
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

    await page.waitForSelector(profilePage.profileName['_selector']);
    expect(await profilePage.profileName).toBeVisible();
    await profilePage.profilePostsLink.click();
    await page.waitForSelector(profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']);
    await expect(profilePage.page.locator('[data-testid="post-author"]').first()).toContainText(
      profileNameApi
    );

    const profilePostCountApi = (await responseGetAccounts.json()).result[0].post_count;
    expect(await profilePage.profileNumberOfPosts.textContent()).toContain(String(profilePostCountApi));

    // Compare follower and following number from api to the respondent on the website
    const responseGetFollowCount = await request.post(`${url}/`, {
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

    await expect(profilePage.profileFollowers).toContainText(String(followerCount));
    await expect(profilePage.profileFollowing).toContainText(String(followingCount));
  });

  test('profile navigation of @gtg is loaded', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileNavigationIsVisible();
  });

  test('profile Blog tab of @gtg is loaded', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileBlogTabIsSelected();
  });

  test('move to Posts Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profilePostsTabIsNotSelected();
    await profilePage.moveToPostsTab();
  });

  test('move to Replies Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileRepliesTabIsNotSelected();
    await profilePage.moveToRepliesTab();
  });

  test('move to Social Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSocialTabIsNotSelected();
    await profilePage.moveToSocialTab();
  });

  test('move to Peakd by link in Social Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSocialTabIsNotSelected();
    await profilePage.moveToSocialTab();
    await profilePage.moveToPeakdByLinkInSocialTab();
  });

  test('move to Hivebuzz by link in Social Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSocialTabIsNotSelected();
    await profilePage.moveToSocialTab();
    await profilePage.moveToHivebuzzByLinkInSocialTab();
  });

  test('move to Notifications Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsNotSelected();
    await profilePage.moveToNotificationsTab();
  });

  test('move to Wallet Page', async ({ page,context }) => {
    await profilePage.gotoProfilePage('@gtg');
    // await profilePage.moveToWalletPage();
    const [newWindow] = await Promise.all([
      context.waitForEvent('page'),
      await page.locator('[data-testid="profile-navigation"] ul:last-child').getByText('Wallet').click()
    ])
    await newWindow.waitForLoadState()
    expect(newWindow.url()).toContain(`/transfers`)
    
  });

  // Skipped - Settings Tab is unavailable
  test.skip('move to Settings Tab', async ({ page }) => {
    await profilePage.gotoProfilePage('@gtg');
    await profilePage.profileSettingsTabIsNotSelected();
    await profilePage.moveToSettingsTab();
  });

  // Skipped - Settings Tab is unavailable
  test.skip('move to Settings Tab and validate public profile settings form is visible', async ({ page }) => {
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

  // Skipped - Settings Tab is unavailable
  test.skip('move to Settings Tab and validate preferences settings form is visible', async ({ page }) => {
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

  // Skipped - Settings Tab is unavailable
  test.skip('move to Settings Tab and validate advanced settings form is visible', async ({ page }) => {
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
      expect(await element.textContent()).toBe(expectedEndpoints[index]);
    });

    await expect(profilePage.advancedSettingsApiEndpointButton.first()).toHaveAttribute(
      'data-state',
      'checked'
    );
    await expect(profilePage.advancedSettingsApiEndpointButton.last()).toHaveAttribute(
      'data-state',
      'unchecked'
    );

    await expect(profilePage.advancedSettingsApiEndpointAddInput).toHaveAttribute(
      'placeholder',
      'Add API Endpoint'
    );
    await expect(profilePage.advancedSettingsApiEndpointAddButton).toHaveText('Add');
    await expect(profilePage.advancedSettingsApiResetEndpointsButton).toBeVisible();
  });

  // The Follow button is unavailable
  test.skip('The Follow button changes color when you hover over it (Light theme)', async ({ page }) => {
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

  // The Follow button is unavailable
  test.skip('The Follow button changes color when you hover over it (Dark theme)', async ({ page }) => {
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
