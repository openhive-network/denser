import { Locator, Page, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly profileNickName: Locator;
  readonly profileInfo: any;
  readonly profileName: Locator;
  readonly profileAbout: Locator;
  readonly profileLastTimeActive: Locator;
  readonly profileJoined: Locator;
  readonly profileLocation: Locator;
  readonly profileStats: Locator;
  readonly followButton: Locator;
  readonly userLinks: Locator;

  readonly profileNav: Locator;
  readonly profileFeedLink: Locator;
  readonly profilePostsLink: Locator;
  readonly profileRepliesLink: Locator;
  readonly profileSocialLink: Locator;
  readonly profileNotificationsLink: Locator;
  readonly profileWalletLink: Locator;
  readonly profileSettingsLink: Locator;

  readonly postFeedItem: any;
  readonly postsMenu: Locator;
  readonly postsMenuPostsButton: Locator;
  readonly postsMenuCommentsButton: Locator;
  readonly postsMenuPayoutsButton: Locator;

  readonly repliesCommentListItem: any;

  readonly notificationsMenu: any;
  readonly notificationsMenuAllButton: Locator;
  readonly notificationsMenuRepliesButton: Locator;
  readonly notificationsMenuMentionsButton: Locator;
  readonly notificationsMenuFollowsButton: Locator;
  readonly notificationsMenuUpvotesButton: Locator;
  readonly notificationsMenuReblogsButton: Locator;
  readonly notificationsMenuAllContent: Locator;

  readonly publicProfileSettings: any;

  readonly thirdPartyAppPeakdLink: Locator;
  readonly thirdPartyAppHivebuzzLink: Locator;

  readonly communitySubscriptionHeader: any;

  constructor(page: Page) {
    this.page = page;
    this.profileInfo = page.locator('[data-testid="profile-info"]');
    this.profileName = page.locator('[data-testid="profile-name"]');
    this.profileNickName = page.locator('[data-testid="profile-nickname"]');
    this.profileAbout = page.locator('[data-testid="profile-about"]');
    this.profileLastTimeActive = page.locator('[data-testid="user-last-time-active"]');
    this.profileJoined = page.locator('[data-testid="user-joined"]');
    this.profileLocation = page.locator('[data-testid="user-location"]');
    this.profileStats = page.locator('[data-testid="profile-stats"]');
    this.followButton = page.locator('[data-testid="profile-follow-button"]');
    this.userLinks = page.locator('[data-testid="user-links"]');

    this.profileNav = page.locator('[data-testid="profile-navigation"]');
    this.profileFeedLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child li a')
      .getByText('Feed');
    this.profilePostsLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Posts');
    this.profileRepliesLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Replies');
    this.profileSocialLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Social');
    this.profileNotificationsLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Notifications');
    this.profileWalletLink = page
      .locator('[data-testid="profile-navigation"] ul:last-child')
      .getByText('Wallet');
    this.profileSettingsLink = page
      .locator('[data-testid="profile-navigation"] ul:last-child')
      .getByText('Settings');

    this.postFeedItem = page.locator('[data-testid="post-list-item"]');
    this.postsMenu = page.locator('[data-testid="user-post-menu"]');
    this.postsMenuPostsButton = page.locator('[data-testid="user-post-menu"]').getByText('Posts');
    this.postsMenuCommentsButton = page.locator('[data-testid="user-post-menu"]').getByText('Comments');
    this.postsMenuPayoutsButton = page.locator('[data-testid="user-post-menu"]').getByText('Payouts');

    this.repliesCommentListItem = page.locator('[data-testid="comment-list-item"]');

    this.notificationsMenu = page.locator('[data-testid="notifications-local-menu"]');
    this.notificationsMenuAllButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('All');
    this.notificationsMenuRepliesButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Replies');
    this.notificationsMenuMentionsButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Mentions');
    this.notificationsMenuFollowsButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Follows');
    this.notificationsMenuUpvotesButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Upvotes');
    this.notificationsMenuReblogsButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Reblogs');
    this.notificationsMenuAllContent = page.locator('[data-testid="notifications-content-all"]');

    this.publicProfileSettings = page.locator('[data-testid="public-profile-settings"]');

    this.thirdPartyAppPeakdLink = page.locator('a[href="https://peakd.com/"]');
    this.thirdPartyAppHivebuzzLink = page.locator('a[href="https://hivebuzz.me/"]');
    this.communitySubscriptionHeader = page.getByText('Community Subscriptions')
  }

  async gotoProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.profileInfo['_selector']);
  }

  async profileNickNameIsEqual(nickName: string) {
    expect(await this.profileNickName.textContent()).toMatch(nickName);
  }

  async profileInfoIsVisible(
    nickName: string,
    profileName: string,
    profileAbout: string,
    userJoined: string
  ) {
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await expect(this.profileInfo).toBeVisible();
    expect(await this.profileNickName.textContent()).toMatch(nickName);
    expect(await this.profileName.textContent()).toMatch(profileName);
    await this.profileNickNameIsEqual(nickName);
    expect(await this.profileAbout.textContent()).toMatch(profileAbout);
    await expect(this.profileLastTimeActive).toBeVisible();
    expect(await this.profileJoined.textContent()).toMatch(userJoined);
    await expect(this.profileLocation).toBeVisible();
    await expect(this.profileStats).toBeVisible();
    await expect(this.followButton).toBeVisible();
    await expect(this.userLinks).toBeVisible();
  }

  async profileNavigationIsVisible() {
    await expect(this.profileNav).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const property = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return property;
  }

  async profileFeedTabIsSelected() {
    await this.page.waitForSelector(this.postFeedItem['_selector']);
    expect(await this.getElementCssPropertyValue(this.profileFeedLink, 'color')).toBe('rgb(220, 38, 38)');
    await expect(this.postFeedItem).toHaveCount(20);
  }

  async profilePostsTabIsSelected() {
    await this.page.waitForSelector(this.postFeedItem['_selector']);
    expect(await this.getElementCssPropertyValue(this.profilePostsLink, 'color')).toBe('rgb(220, 38, 38)');
    await expect(this.postFeedItem).toHaveCount(20);
  }

  async profilePostsTabIsNotSelected() {
    expect(await this.getElementCssPropertyValue(this.profilePostsLink, 'color')).toBe('rgb(15, 23, 42)');
  }

  async profileRepliesTabIsSelected() {
    await this.page.waitForSelector(this.repliesCommentListItem['_selector']);
    expect(await this.getElementCssPropertyValue(this.profileRepliesLink, 'color')).toBe('rgb(220, 38, 38)');
    await expect(this.repliesCommentListItem).toHaveCount(20);
  }

  async profileRepliesTabIsNotSelected() {
    expect(await this.getElementCssPropertyValue(this.profileRepliesLink, 'color')).toBe('rgb(15, 23, 42)');
    expect(await this.getElementCssPropertyValue(this.profileRepliesLink, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }

  async profileSocialTabIsSelected() {
    await this.page.waitForSelector(this.communitySubscriptionHeader['_selector']);
    // await this.page.waitForSelector(this.page.getByText('Community Subscriptions')['_selector']);
    await expect(this.page.getByText('Community Subscriptions')).toBeVisible();
    await expect(
      this.page.getByText('The author has subscribed to the following Hive Communities')
    ).toBeVisible();
    await expect(this.page.getByText('Badges and achievements')).toBeVisible();
    await expect(
      this.page.getByText(
        'These are badges received by the author via the third-party apps Peakd & Hivebuzz.'
      )
    ).toBeVisible();
    expect(await this.getElementCssPropertyValue(this.profileSocialLink, 'color')).toBe('rgb(220, 38, 38)');
  }

  async profileSocialTabIsNotSelected() {
    expect(await this.getElementCssPropertyValue(this.profileSocialLink, 'color')).toBe('rgb(15, 23, 42)');
    expect(await this.getElementCssPropertyValue(this.profileSocialLink, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }

  async profileNotificationsTabIsSelected() {
    await this.page.waitForSelector(this.notificationsMenu['_selector']);
    expect(await this.notificationsMenu).toBeVisible();
    expect(await this.notificationsMenu.locator('button')).toHaveCount(6);
    expect(await this.notificationsMenuAllContent).toBeVisible();
    expect(await this.getElementCssPropertyValue(this.profileNotificationsLink, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
  }

  async profileNotificationsTabIsNotSelected() {
    expect(await this.getElementCssPropertyValue(this.profileNotificationsLink, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
    expect(await this.getElementCssPropertyValue(this.profileNotificationsLink, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }

  async profileSettingsTabIsSelected() {
    await this.page.waitForSelector(this.publicProfileSettings['_selector']);
    expect(await this.page.getByText('Public Profile Settings'));
    expect(await this.page.getByText('Preferences'));
    expect(await this.page.getByText('API Endpoint Options'));
    expect(await this.getElementCssPropertyValue(this.profileSettingsLink, 'color')).toBe('rgb(220, 38, 38)');
  }

  async profileSettingsTabIsNotSelected() {
    expect(await this.getElementCssPropertyValue(this.profileSettingsLink, 'color')).toBe('rgb(15, 23, 42)');
    expect(await this.getElementCssPropertyValue(this.profileSettingsLink, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }

  async moveToPostsTab() {
    await this.profilePostsLink.click();
    await expect(this.postsMenu).toBeVisible();
    await this.profilePostsTabIsSelected();
  }

  async moveToRepliesTab() {
    await this.profileRepliesLink.click();
    await this.profileRepliesTabIsSelected();
  }

  async moveToSocialTab() {
    await this.profileSocialLink.click();
    await this.profileSocialTabIsSelected();
  }

  async moveToNotificationsTab() {
    await this.profileNotificationsLink.click();
    await this.profileNotificationsTabIsSelected();
  }

  async moveToWalletPage() {
    await this.profileWalletLink.click();
    await expect(this.page).toHaveURL(/https:\/\/wallet.hive.blog\/@gtg\/transfers$/);
    await this.page.waitForTimeout(1000);
    await expect(this.page).toHaveTitle('Gandalf the Grey (@gtg) — Hive');
  }

  async moveToSettingsTab() {
    await this.profileSettingsLink.click();
    await this.profileSettingsTabIsSelected();
  }

  async moveToPeakdByLinkInSocialTab() {
    await this.thirdPartyAppPeakdLink.click();
    await expect(this.page).toHaveURL('https://peakd.com/');
    await expect(this.page).toHaveTitle('PeakD');
  }

  async moveToHivebuzzByLinkInSocialTab() {
    await this.thirdPartyAppHivebuzzLink.click();
    await expect(this.page).toHaveURL('https://hivebuzz.me/');
    await expect(this.page).toHaveTitle('HiveBuzz');
  }
}
