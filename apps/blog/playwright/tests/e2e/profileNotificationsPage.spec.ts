import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { ApiHelper } from '../support/apiHelper';
import { PostPage } from '../support/pages/postPage';
import { CommentViewPage } from '../support/pages/commentViewPage';

test.describe('Notifications Tab in Profile page of @gtg', () => {
  let homePage: HomePage;
  let profilePage: ProfilePage;
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    profilePage = new ProfilePage(page);
    apiHelper = new ApiHelper(page);
  });

  test('Notifications Tab of @gtg is loaded', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();
  });

  test('Compare UI notifications list amount with API notification list amount in All tab', async ({
    page
  }) => {
    // Intercept the account_notifications response the UI itself fetches
    // to eliminate race conditions from separate API calls.
    const notificationsPromise = page.waitForResponse(
      (response) => {
        const postData = response.request().postDataJSON?.();
        return postData?.method === 'bridge.account_notifications';
      },
      { timeout: 30000 }
    );

    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const notificationsResponse = await notificationsPromise;
    const notifications: unknown[] = (await notificationsResponse.json()).result;

    const notificationListItemInAllArray = await profilePage.notificationListItemInAll.all();
    expect(notificationListItemInAllArray.length).toBe(notifications.length);
  });

  test('Move to the profile page of authors the first notification in All tab', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const firstNotificationAuthorName = await profilePage.notificationNickName.first().textContent();
    await profilePage.notificationAccountIconLink.first().click();
    // Wait for navigation to author's profile page
    await profilePage.page.waitForURL(url => url.href.includes(firstNotificationAuthorName as string));
    // Validate new url of notification's author
    await expect(profilePage.page.url()).toContain(firstNotificationAuthorName);
  });

  // Skip this test due to move to the non existing page
  // Issue: https://gitlab.syncad.com/hive/denser/-/issues/449
  test.skip('Click the first three notifications and move to specific page', async ({ page }) => {
    let postPage = new PostPage(page);
    let commentPage = new CommentViewPage(page);

    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const resNotificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    // Validate the first five notifications types and move to the specific pages

    for (let notification = 0; notification < 3; notification++) {
      // console.log('API respons: ', await resNotificationsAPI);
      const firstNotificationTypeAPI = await resNotificationsAPI.result[notification].type;
      // console.log('First notification type: ', await firstNotificationTypeAPI);
      const firstNotificationMsgAPI = await resNotificationsAPI.result[notification].msg;
      // console.log('First notification msg: ', await firstNotificationMsgAPI);
      const firstNotificationUrlAPI = await resNotificationsAPI.result[notification].url;
      // console.log('First notification url: ', await firstNotificationUrlAPI);

      // type: reblog - open post page
      // type: reply - open comment view page
      // type: mention - open post page
      // type: vote - open post page
      // type: reply_comment - open comment view page
      // type: follow - open profile page

      const firstNotificationLink = await profilePage.notificationAccountAndMessage.nth(notification);
      await firstNotificationLink.click();
      if (
        firstNotificationTypeAPI == 'reblog' ||
        firstNotificationTypeAPI == 'mention' ||
        firstNotificationTypeAPI == 'vote'
      ) {
        // await profilePage.page.waitForSelector(postPage.articleBody['_selector']);
        const firstSelectorResolvedPromiseResult = await Promise.race([
          profilePage.page.waitForSelector(postPage.articleBody['_selector']),
          profilePage.page.waitForSelector(page.getByText('Sorry! This page does not exist')['_selector'])
        ]);
        await expect(profilePage.page.url()).toContain(firstNotificationUrlAPI);
      }
      if (firstNotificationTypeAPI == 'reply' || firstNotificationTypeAPI == 'reply_comment') {
        const firstSelectorResolvedPromiseResult = await Promise.race([
          profilePage.page.waitForSelector(commentPage.getMainCommentAuthorData['_selector']),
          profilePage.page.waitForSelector(page.getByText('Sorry! This page does not exist')['_selector'])
        ]);
        await expect(profilePage.page.url()).toContain(firstNotificationUrlAPI);
      }
      if (firstNotificationTypeAPI == 'follow') {
        const firstSelectorResolvedPromiseResult = await Promise.race([
          profilePage.page.waitForSelector(profilePage.profileInfo['_selector']),
          profilePage.page.waitForSelector(page.getByText('Sorry! This page does not exist')['_selector'])
        ]);
        await profilePage.page.waitForTimeout(5000);
        if (await profilePage.userHasNotStartedBloggingYetMsg.isVisible())
          await expect(await profilePage.userHasNotStartedBloggingYetMsg.textContent()).toContain(
            "hasn't started blogging yet!"
          );
        else await expect(profilePage.postBlogItem.first()).toBeVisible();
      }
      await profilePage.page.goBack();
      await profilePage.page.waitForSelector(profilePage.notificationsMenuAllContent['_selector']);
      await profilePage.profileNotificationsTabIsSelected();
    }
  });

  test('Validate the filter of notifications', async ({ page }) => {
    // Intercept the account_notifications response the UI itself fetches
    // to eliminate race conditions from separate API calls.
    const notificationsPromise = page.waitForResponse(
      (response) => {
        const postData = response.request().postDataJSON?.();
        return postData?.method === 'bridge.account_notifications';
      },
      { timeout: 30000 }
    );

    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const notificationsResponse = await notificationsPromise;
    const notifications: { type: string }[] = (await notificationsResponse.json()).result;

    // type: reblog - open post page
    // type: reply - open comment view page
    // type: mention - open post page
    // type: vote - open post page
    // type: reply_comment - open comment view page
    // type: follow - open profile page

    const countByType = (type: string) => notifications.filter((n) => n.type === type).length;
    const amountNotificationsReblogType = countByType('reblog');
    const amountNotificationsReplyType = countByType('reply');
    const amountNotificationsReplyCommentType = countByType('reply_comment');
    const amountNotificationsMentionType = countByType('mention');
    const amountNotificationsVoteType = countByType('vote');
    const amountNotificationsFollowType = countByType('follow');
    const knownTypes = ['reblog', 'reply', 'reply_comment', 'mention', 'vote', 'follow'];
    const amountNotificationsDifferentType = notifications.filter(
      (n) => !knownTypes.includes(n.type)
    ).length;

    // Validate the amount of all notifications
    const allNotificationsUI = await profilePage.notificationListItemInAll.all();
    const amountAllNotificationsUI = allNotificationsUI.length;
    expect(amountAllNotificationsUI).toBe(notifications.length);
    // Validate the amount of replies notifications
    await profilePage.notificationsMenuRepliesButton.click();
    const repliesNotificationsUI = await profilePage.notificationListItemInReplies.all();
    const amountRepliesNotificationsUI = repliesNotificationsUI.length;
    expect(amountRepliesNotificationsUI).toBe(
      amountNotificationsReplyType + amountNotificationsReplyCommentType
    );
    // Validate the amount of mentions notifications
    await profilePage.notificationsMenuMentionsButton.click();
    const mentionsNotificationsUI = await profilePage.notificationListItemInMentions.all();
    const amountMentionsNotificationsUI = mentionsNotificationsUI.length;
    expect(amountMentionsNotificationsUI).toBe(amountNotificationsMentionType);
    // Validate the amount of follows notifications
    await profilePage.notificationsMenuFollowsButton.click();
    const followsNotificationsUI = await profilePage.notificationListItemInFollows.all();
    const amountFollowsNotificationsUI = followsNotificationsUI.length;
    expect(amountFollowsNotificationsUI).toBe(amountNotificationsFollowType);
    // Validate the amount of upvotes notifications
    await profilePage.notificationsMenuUpvotesButton.click();
    const upvotesNotificationsUI = await profilePage.notificationListItemInUpvotes.all();
    const amountUpvotesNotificationsUI = upvotesNotificationsUI.length;
    expect(amountUpvotesNotificationsUI).toBe(amountNotificationsVoteType);
    // Validate the amount of reblogs notifications
    await profilePage.notificationsMenuReblogsButton.click();
    const reblogsNotificationsUI = await profilePage.notificationListItemInReblogs.all();
    const amountReblogsNotificationsUI = reblogsNotificationsUI.length;
    expect(amountReblogsNotificationsUI).toBe(amountNotificationsReblogType);
    // Validate the amount of different notifications is 0
    expect(amountNotificationsDifferentType).toBe(0);
  });

  test('Validate the filter of notifications styles', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    // Validate notification menu is visible
    await expect(profilePage.notificationsMenu).toBeVisible();

    // "All" tab is active by default
    await expect(profilePage.notificationsMenuAllButton).toBeVisible();
    await expect(profilePage.notificationsMenuAllContent).toBeVisible();

    // Click each filter tab and verify its content panel appears
    await profilePage.validateNotificationFilterTabSwitch(
      profilePage.notificationsMenuRepliesButton,
      profilePage.notificationsMenuRepliesContent
    );
    await profilePage.validateNotificationFilterTabSwitch(
      profilePage.notificationsMenuMentionsButton,
      profilePage.notificationsMenuMentionsContent
    );
    await profilePage.validateNotificationFilterTabSwitch(
      profilePage.notificationsMenuFollowsButton,
      profilePage.notificationsMenuFollowsContent
    );
    await profilePage.validateNotificationFilterTabSwitch(
      profilePage.notificationsMenuUpvotesButton,
      profilePage.notificationsMenuUpvotesContent
    );
    await profilePage.validateNotificationFilterTabSwitch(
      profilePage.notificationsMenuReblogsButton,
      profilePage.notificationsMenuReblogsContent
    );
  });

  test('Validate the notifications styles in light mode', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    // Get list of notifications by the api request
    const notificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');

    // Get first notification list item
    const firstNotificationItem = profilePage.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]').first();

    // First Notification
    await expect(firstNotificationItem).toBeVisible();
    // Validate the account icon is visible in the first notification
    await expect(profilePage.notificationAccountIconLink.locator('img').first()).toBeVisible();
    // Validate the account and message is visible
    await expect(profilePage.notificationAccountAndMessage.first()).toBeVisible();
    // Validate the timestamp is visible
    await expect(profilePage.notificationTimestamp.first()).toBeVisible();
    // Validate reputation badge exists and shows score
    const firstReputationBadge = firstNotificationItem.locator('[data-testid="notification-reputation-badge"]');
    await expect(firstReputationBadge).toBeVisible();
    await expect(firstReputationBadge).toHaveText(String(notificationsAPI.result[0].score));

    // Second Notification
    const secondNotificationItem = profilePage.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]').nth(1);

    await expect(secondNotificationItem).toBeVisible();
    // Validate the account icon is visible in the second notification
    await expect(profilePage.notificationAccountIconLink.locator('img').nth(1)).toBeVisible();
    // Validate reputation badge exists and shows score
    const secondReputationBadge = secondNotificationItem.locator('[data-testid="notification-reputation-badge"]');
    await expect(secondReputationBadge).toBeVisible();
    await expect(secondReputationBadge).toHaveText(String(notificationsAPI.result[1].score));
  });

  test('Validate the notifications styles in dark mode', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');

    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    await homePage.changeThemeMode('Dark');
    await homePage.validateDarkModeByClass();

    // Get list of notifications by the api request
    const notificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');

    // Get first notification list item
    const firstNotificationItem = profilePage.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]').first();

    // First Notification
    await expect(firstNotificationItem).toBeVisible();
    // Validate the account icon is visible in the first notification
    await expect(profilePage.notificationAccountIconLink.locator('img').first()).toBeVisible();
    // Validate the account and message is visible
    await expect(profilePage.notificationAccountAndMessage.first()).toBeVisible();
    // Validate the timestamp is visible
    await expect(profilePage.notificationTimestamp.first()).toBeVisible();
    // Validate reputation badge exists and shows score
    const firstReputationBadge = firstNotificationItem.locator('[data-testid="notification-reputation-badge"]');
    await expect(firstReputationBadge).toBeVisible();
    await expect(firstReputationBadge).toHaveText(String(notificationsAPI.result[0].score));

    // Second Notification
    const secondNotificationItem = profilePage.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]').nth(1);

    await expect(secondNotificationItem).toBeVisible();
    // Validate the account icon is visible in the second notification
    await expect(profilePage.notificationAccountIconLink.locator('img').nth(1)).toBeVisible();
    // Validate reputation badge exists and shows score
    const secondReputationBadge = secondNotificationItem.locator('[data-testid="notification-reputation-badge"]');
    await expect(secondReputationBadge).toBeVisible();
    await expect(secondReputationBadge).toHaveText(String(notificationsAPI.result[1].score));
  });

  // Temporary skipped it works localy but there are some problems in CI
  test.skip('Validate the notifications load more button', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const resAccountNotificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    const lastNotificationId = await resAccountNotificationsAPI.result[47].id;
    const notificationListItemInAllArray = await profilePage.notificationListItemInAll.all();
    expect(await notificationListItemInAllArray.length).toBe(resAccountNotificationsAPI.result.length);

    // Click Load more button and validate the amount of notifications
    const resAccountNotificationsAPILoadMore = await apiHelper.getAccountNotificationsAPI(
      'gtg',
      50,
      lastNotificationId
    );
    await profilePage.notificationLoadMoreButtonInAll.click();
    // Wait for more notifications to load
    const expectedCount = resAccountNotificationsAPI.result.length + resAccountNotificationsAPILoadMore.result.length;
    await expect.poll(async () => {
      return (await profilePage.notificationListItemInAll.all()).length;
    }).toBe(expectedCount);
    const notificationListItemInAllArrayAfterLoadMoreClicked =
      await profilePage.notificationListItemInAll.all();
    expect(await notificationListItemInAllArrayAfterLoadMoreClicked.length).toBe(
      resAccountNotificationsAPI.result.length + resAccountNotificationsAPILoadMore.result.length
    );
  });

  // Temporary skipped - Load more button only shows when there's more data to load
  test.skip('Validate the notifications load more button style', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    await expect(profilePage.notificationLoadMoreButtonInAll).toBeVisible();
    await expect(profilePage.notificationLoadMoreButtonInAll).toBeEnabled();
  });

  // Temporary skipped it works localy but there are some problems in CI
  test.skip('Validate the notifications load more button in Reblogs Filter Tab', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const resAccountNotificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    const amountNotificationsAPI: number = await resAccountNotificationsAPI.result.length; // expected up to 50 (set request limit)
    const lastNotificationId = await resAccountNotificationsAPI.result[amountNotificationsAPI-1].id;

    // Count how many notifications of the Reblog type is after first request
    let amountNotificationsReblogType: number = 0;
    for (let i = 0; i < amountNotificationsAPI; i++) {
      if ((await resAccountNotificationsAPI.result[i].type) == 'reblog') amountNotificationsReblogType++;
    }
    // Count how many notifications of the Reblog type is in after second request
    const resAccountNotificationsAPILoadMore = await apiHelper.getAccountNotificationsAPI(
      'gtg',
      50,
      lastNotificationId
    );
    const amountNotificationsAPI2: number = await resAccountNotificationsAPILoadMore.result.length; // expected up to 50 (set request limit)
    let amountNotificationsReblogType2: number = 0;
    for (let i = 0; i < amountNotificationsAPI2; i++) {
      if ((await resAccountNotificationsAPILoadMore.result[i].type) == 'reblog')
        amountNotificationsReblogType2++;
    }

    // Move to the Reblog Tab
    await profilePage.notificationsMenuReblogsButton.click();
    if (await profilePage.page.locator('table').isVisible())
      await profilePage.page.waitForSelector(await profilePage.notificationListItemInReblogs['_selector']);

    // Compare amount of the reblogs notifications with api response before clicking Load more
    const notificationListItemInReblogsArray = await profilePage.notificationListItemInReblogs.all();
    expect(await notificationListItemInReblogsArray.length).toBe(amountNotificationsReblogType);

    // Compare amount of the reblogs notifications with api response after clicking Load more
    await profilePage.notificationLoadMoreButtonInReblogs.click();
    if (await profilePage.page.locator('table').isVisible())
      await profilePage.page.waitForSelector(await profilePage.notificationListItemInReblogs['_selector']);
    const notificationListItemInReblogsArray2 = await profilePage.notificationListItemInReblogs.all();
    expect(await notificationListItemInReblogsArray2.length).toBe(
      amountNotificationsReblogType + amountNotificationsReblogType2
    );
  });
});
