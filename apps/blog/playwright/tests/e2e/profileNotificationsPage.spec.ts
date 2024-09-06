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
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const resAccountNotificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    const notificationListItemInAllArray = await profilePage.notificationListItemInAll.all();
    expect(await notificationListItemInAllArray.length).toBe(resAccountNotificationsAPI.result.length);
  });

  test('Move to the profile page of authors the first notification in All tab', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const firstNotificationAuthorName = await profilePage.notificationNickName.first().textContent();
    await profilePage.notificationAccountIconLink.first().click();
    await profilePage.page.waitForSelector(profilePage.profileInfo['_selector']);
    // Validate new url of notification's author
    await expect(profilePage.page.url()).toContain(firstNotificationAuthorName);
  });

  // Skip this test due to move to the non existing page
  // Issue: https://gitlab.syncad.com/hive/denser/-/issues/449
  test('Click the first three notifications and move to specific page', async ({ page }) => {
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
    let postPage = new PostPage(page);
    let commentPage = new CommentViewPage(page);

    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const resNotificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    const amountNotificationsAPI: number = await resNotificationsAPI.result.length; // expected up to 50 (set request limit)

    // type: reblog - open post page
    // type: reply - open comment view page
    // type: mention - open post page
    // type: vote - open post page
    // type: reply_comment - open comment view page
    // type: follow - open profile page

    let amountNotificationsReblogType: number = 0;
    let amountNotificationsReplyType: number = 0;
    let amountNotificationsMentionType: number = 0;
    let amountNotificationsVoteType: number = 0;
    let amountNotificationsReplyCommentType: number = 0;
    let amountNotificationsFollowType: number = 0;
    let amountNotificationsDifferentType: number = 0;

    for (let i = 0; i < amountNotificationsAPI; i++) {
      if ((await resNotificationsAPI.result[i].type) == 'reblog') amountNotificationsReblogType++;
      else if ((await resNotificationsAPI.result[i].type) == 'reply') amountNotificationsReplyType++;
      else if ((await resNotificationsAPI.result[i].type) == 'reply_comment')
        amountNotificationsReplyCommentType++;
      else if ((await resNotificationsAPI.result[i].type) == 'mention') amountNotificationsMentionType++;
      else if ((await resNotificationsAPI.result[i].type) == 'vote') amountNotificationsVoteType++;
      else if ((await resNotificationsAPI.result[i].type) == 'follow') amountNotificationsFollowType++;
      else amountNotificationsDifferentType++;
    }

    // console.log('        Reblog number: ', amountNotificationsReblogType);
    // console.log('         Reply number: ', amountNotificationsReplyType);
    // console.log(' Reply_comment number: ', amountNotificationsReplyCommentType);
    // console.log('       Mention number: ', amountNotificationsMentionType);
    // console.log('          Vote number: ', amountNotificationsVoteType);
    // console.log('        Follow number: ', amountNotificationsFollowType);
    // console.log('Different type number: ', amountNotificationsDifferentType);

    // Validate the amount of all notifications
    const allNotificationsUI = await profilePage.notificationListItemInAll.all();
    const amountAllNotificationsUI = await allNotificationsUI.length;
    await expect(await amountAllNotificationsUI).toBe(amountNotificationsAPI);
    // Validate the amount of replies notifications
    await profilePage.notificationsMenuRepliesButton.click();
    const repliesNotificationsUI = await profilePage.notificationListItemInReplies.all();
    const amountRepliesNotificationsUI = await repliesNotificationsUI.length;
    await expect(await amountRepliesNotificationsUI).toBe(
      amountNotificationsReplyType + amountNotificationsReplyCommentType
    );
    // Validate the amount of mentions notifications
    await profilePage.notificationsMenuMentionsButton.click();
    const mentionsNotificationsUI = await profilePage.notificationListItemInMentions.all();
    const amountMentionsNotificationsUI = await mentionsNotificationsUI.length;
    await expect(await amountMentionsNotificationsUI).toBe(amountNotificationsMentionType);
    // Validate the amount of follows notifications
    await profilePage.notificationsMenuFollowsButton.click();
    const followsNotificationsUI = await profilePage.notificationListItemInFollows.all();
    const amountFollowsNotificationsUI = await followsNotificationsUI.length;
    await expect(await amountFollowsNotificationsUI).toBe(amountNotificationsFollowType);
    // Validate the amount of upvotes notifications
    await profilePage.notificationsMenuUpvotesButton.click();
    const upvotesNotificationsUI = await profilePage.notificationListItemInUpvotes.all();
    const amountUpvotesNotificationsUI = await upvotesNotificationsUI.length;
    await expect(await amountUpvotesNotificationsUI).toBe(amountNotificationsVoteType);
    // Validate the amount of reblogs notifications
    await profilePage.notificationsMenuReblogsButton.click();
    const reblogsNotificationsUI = await profilePage.notificationListItemInReblogs.all();
    const amountReblogsNotificationsUI = await reblogsNotificationsUI.length;
    await expect(await amountReblogsNotificationsUI).toBe(amountNotificationsReblogType);
    // Validate the amount of different notifications is 0
    await expect(amountNotificationsDifferentType).toBe(0);
  });

  test('Validate the filter of notifications styles', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    // Validate the background-color of notifications filter menu
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenu, 'background-color')
    ).toBe('rgb(225, 231, 239)');
    // Validate the styles of all notifications
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuAllButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuAllButton, 'color')
    ).toBe('rgb(51, 51, 51)');
    // Validate the styles of replies notifications before clicking it
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuRepliesButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuRepliesButton, 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate the styles of replies notifications after clicking it
    await profilePage.notificationsMenuRepliesButton.click();
    await profilePage.page.waitForTimeout(500);
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuRepliesButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuRepliesButton, 'color')
    ).toBe('rgb(51, 51, 51)');
    // Validate the styles of mentions notifications before clicking it
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuMentionsButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuMentionsButton, 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate the styles of mentions notifications after clicking it
    await profilePage.notificationsMenuMentionsButton.click();
    await profilePage.page.waitForTimeout(500);
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuMentionsButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuMentionsButton, 'color')
    ).toBe('rgb(51, 51, 51)');
    // Validate the styles of follows notifications before clicking it
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuFollowsButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuFollowsButton, 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate the styles of follows notifications after clicking it
    await profilePage.notificationsMenuFollowsButton.click();
    await profilePage.page.waitForTimeout(500);
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuFollowsButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuFollowsButton, 'color')
    ).toBe('rgb(51, 51, 51)');
    // Validate the styles of upvotes notifications before clicking it
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuUpvotesButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuUpvotesButton, 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate the styles of upvotes notifications after clicking it
    await profilePage.notificationsMenuUpvotesButton.click();
    await profilePage.page.waitForTimeout(500);
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuUpvotesButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuUpvotesButton, 'color')
    ).toBe('rgb(51, 51, 51)');
    // Validate the styles of reblogs notifications before clicking it
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuReblogsButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuReblogsButton, 'color')
    ).toBe('rgb(100, 116, 139)');
    // Validate the styles of reblogs notifications after clicking it
    await profilePage.notificationsMenuReblogsButton.click();
    await profilePage.page.waitForTimeout(500);
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationsMenuReblogsButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationsMenuReblogsButton, 'color')
    ).toBe('rgb(51, 51, 51)');
  });

  test('Validate the notifications styles in light mode', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const widthProgressBar = 60; // 100%
    const firstNotificationItem = await profilePage.notificationListItemOddInAll.first();
    const secondNotificationItem = await profilePage.notificationListItemEvenInAll.first();

    // First Notification
    // Validate background color of the first notification
    expect(
      await profilePage.getElementCssPropertyValue(await firstNotificationItem, 'background-color')
    ).toBe('rgb(255, 255, 255)');
    // Validate the account icon is visible in the first notification
    expect(await profilePage.notificationAccountIconLink.locator('img').first()).toBeVisible();
    // Validate the account and message color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationAccountAndMessage.first(),
        'color'
      )
    ).toBe('rgb(51, 51, 51)');
    // Validate the timestamp color of the first notification
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationTimestamp.first(), 'color')
    ).toBe('rgb(156, 163, 175)');
    // Validate the progress bar of the first notification
    // Get list of notifications by the api request
    let notificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    // Values for progress bar of the first subscriber
    const firstNotificationTransformXwidthPercentage = 100 - notificationsAPI.result[0].score;
    const firstNotificationTransformXwidthValue =
      (widthProgressBar * firstNotificationTransformXwidthPercentage) / 100;
    // console.log('firstNotificationTransformXwidthValue: ', firstNotificationTransformXwidthValue );
    await expect(
      await homePage.getElementCssPropertyValue(
        await profilePage.notificationProgressBar.locator('div').first(),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${firstNotificationTransformXwidthValue}, 0)`);

    // Second Notification
    // Validate background color of the second notification
    expect(
      await profilePage.getElementCssPropertyValue(await secondNotificationItem, 'background-color')
    ).toBe('rgb(225, 231, 239)');
    // Validate the account icon is visible in the second notification
    const secondNotificationAccountIcon = await profilePage.notificationAccountIconLink.locator('img').nth(1);
    await expect(await secondNotificationAccountIcon).toBeVisible();
    // Validate the account and message color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationAccountAndMessage.nth(1),
        'color'
      )
    ).toBe('rgb(51, 51, 51)');
    // Validate the timestamp color of the second notification
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationTimestamp.nth(1), 'color')
    ).toBe('rgb(156, 163, 175)');
    // Values for progress bar of the second subscriber
    const secondNotificationTransformXwidthPercentage = 100 - notificationsAPI.result[1].score;
    const secondNotificationTransformXwidthValue =
      (widthProgressBar * secondNotificationTransformXwidthPercentage) / 100;
    // console.log('secondNotificationTransformXwidthValue: ', secondNotificationTransformXwidthValue );
    await expect(
      await homePage.getElementCssPropertyValue(
        await profilePage.notificationProgressBar.locator('div').nth(1),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${secondNotificationTransformXwidthValue}, 0)`);
  });

  test('Validate the notifications styles in dark mode', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    const widthProgressBar = 60; // 100%
    const firstNotificationItem = await profilePage.notificationListItemOddInAll.first();
    const secondNotificationItem = await profilePage.notificationListItemEvenInAll.first();

    // First Notification
    // Validate background color of the first notification
    expect(
      await profilePage.getElementCssPropertyValue(await firstNotificationItem, 'background-color')
    ).toBe('rgb(44, 48, 53)');
    // Validate the account icon is visible in the first notification
    expect(await profilePage.notificationAccountIconLink.locator('img').first()).toBeVisible();
    // Validate the account and message color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationAccountAndMessage.first(),
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    // Validate the timestamp color of the first notification
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationTimestamp.first(), 'color')
    ).toBe('rgb(156, 163, 175)');
    // Validate the progress bar of the first notification
    // Get list of notifications by the api request
    let notificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    // Values for progress bar of the first subscriber
    const firstNotificationTransformXwidthPercentage = 100 - notificationsAPI.result[0].score;
    const firstNotificationTransformXwidthValue =
      (widthProgressBar * firstNotificationTransformXwidthPercentage) / 100;
    // console.log('firstNotificationTransformXwidthValue: ', firstNotificationTransformXwidthValue );
    await expect(
      await homePage.getElementCssPropertyValue(
        await profilePage.notificationProgressBar.locator('div').first(),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${firstNotificationTransformXwidthValue}, 0)`);

    // Second Notification
    // Validate background color of the second notification
    expect(
      await profilePage.getElementCssPropertyValue(await secondNotificationItem, 'background-color')
    ).toBe('rgb(56, 66, 82)');
    // Validate the account icon is visible in the second notification
    const secondNotificationAccountIcon = await profilePage.notificationAccountIconLink.locator('img').nth(1);
    await expect(await secondNotificationAccountIcon).toBeVisible();
    // Validate the account and message color
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationAccountAndMessage.nth(1),
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    // Validate the timestamp color of the second notification
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationTimestamp.nth(1), 'color')
    ).toBe('rgb(156, 163, 175)');
    // Values for progress bar of the second subscriber
    const secondNotificationTransformXwidthPercentage = 100 - notificationsAPI.result[1].score;
    const secondNotificationTransformXwidthValue =
      (widthProgressBar * secondNotificationTransformXwidthPercentage) / 100;
    // console.log('secondNotificationTransformXwidthValue: ', secondNotificationTransformXwidthValue );
    await expect(
      await homePage.getElementCssPropertyValue(
        await profilePage.notificationProgressBar.locator('div').nth(1),
        'transform'
      )
    ).toBe(`matrix(1, 0, 0, 1, -${secondNotificationTransformXwidthValue}, 0)`);
  });

  test('Validate the notifications load more button', async ({ page }) => {
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
    const notificationListItemInAllArrayAfterLoadMoreClicked =
      await profilePage.notificationListItemInAll.all();
    expect(await notificationListItemInAllArrayAfterLoadMoreClicked.length).toBe(
      resAccountNotificationsAPI.result.length + resAccountNotificationsAPILoadMore.result.length
    );
  });

  test('Validate the notifications load more button style', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    // Style before hovering
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationLoadMoreButtonInAll, 'color')
    ).toBe('rgb(255, 0, 0)');
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationLoadMoreButtonInAll,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    // Style after hovering
    await profilePage.notificationLoadMoreButtonInAll.hover();
    await profilePage.page.waitForTimeout(500);
    expect(
      await profilePage.getElementCssPropertyValue(await profilePage.notificationLoadMoreButtonInAll, 'color')
    ).toBe('rgb(241, 245, 249)');
    expect(
      await profilePage.getElementCssPropertyValue(
        await profilePage.notificationLoadMoreButtonInAll,
        'background-color'
      )
    ).toBe('rgb(255, 0, 0)');
  });

  test('Validate the notifications load more button in Reblogs Filter Tab', async ({ page }) => {
    await profilePage.gotoNotificationsProfilePage('@gtg');
    await profilePage.profileNotificationsTabIsSelected();

    const resAccountNotificationsAPI = await apiHelper.getAccountNotificationsAPI('gtg');
    const amountNotificationsAPI: number = await resAccountNotificationsAPI.result.length; // expected up to 50 (set request limit)
    const lastNotificationId = await resAccountNotificationsAPI.result[47].id;

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
