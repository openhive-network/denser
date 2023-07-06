import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { CommunitiesPage } from '../support/pages/communitiesPage';

test.describe('Communities page tests', () => {
  test.skip('is LeoFinance community page loaded', async ({ page }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
  });

  test.skip('validate the community subscribers, pending rewards, active posters are valid in LeoFinance Community', async ({
    page,
    request
  }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseCommunity = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: 'hive-167922', observer: '' } //hive-167922 - LeoFinance community owner
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const subscribers = (await responseCommunity.json()).result.subscribers;
    const pendingRewards = (await responseCommunity.json()).result.sum_pending;
    const activePosters = (await responseCommunity.json()).result.num_authors;
    const leadership = (await responseCommunity.json()).result.team;

    expect(await communitiesPage.commnnitySubscribers.textContent()).toBe(
      String(subscribers) + 'subscribers'
    );
    expect(await communitiesPage.communityPendingRewards.textContent()).toBe(
      String(pendingRewards) + 'pending rewards'
    );
    expect(await communitiesPage.communityActivePosters.textContent()).toBe(
      String(activePosters) + 'active posters'
    );
  });

  test.skip('validate the community leadership of LeoFinance Community', async ({ page, request }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseCommunity = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: 'hive-167922', observer: '' } //hive-167922 - LeoFinance community owner
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const leadershipListApi = (await responseCommunity.json()).result.team;
    const leadershipListFrontElements = await communitiesPage.communityLeadershipList.all();

    // start from 1 index because 0 index it is owner 'hive-167922'
    const leadershipListApiNames: any[] = [];
    for (let i = 1; i < leadershipListApi.length; i++) {
      leadershipListApiNames.push(leadershipListApi[i][0] + ' ' + leadershipListApi[i][1]);
    }

    const leadershipListNamesFrontElements: any[] = [];
    for (const leadershipFront of leadershipListFrontElements) {
      leadershipListNamesFrontElements.push(await leadershipFront.textContent());
    }

    leadershipListNamesFrontElements.forEach((element, index) => {
      expect(element.toLocaleLowerCase()).toContain(String(leadershipListApiNames[index]));
    });
  });

  test('move to the profile leadership pages of LeoFinance community ', async ({ page }) => {
    const homePage = new HomePage(page);
    const profilePage = new ProfilePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const leadershipLinkLists = await communitiesPage.communityLeadershipList.locator('a').all();

    const leadershipLinkNickNamesLists: any[] = [];
    leadershipLinkLists.forEach((nickNameLink) => {
      leadershipLinkNickNamesLists.push(nickNameLink.textContent());
    });

    for (let i = 0; i < leadershipLinkLists.length; i++) {
      leadershipLinkLists[i].click();
      await page.waitForSelector(profilePage.profileName['_selector']);
      expect(await profilePage.profileName).toBeVisible();
      await profilePage.profilePostsLink.click();
      await page.waitForSelector(profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']);

      if ((await profilePage.page.locator('[data-testid="post-author"]').count()) > 0) {
        expect(await leadershipLinkNickNamesLists[i]).toContain(
          await profilePage.page.locator('[data-testid="post-author"]').first().textContent()
        );
      }
      await page.goBack();
      await page.goBack();
      await communitiesPage.quickValidataCommunitiesPageIsLoaded('LeoFinance');
    }
  });

  test('validate the first post header styles (for Trending filter) in the light theme', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthor, 'color')).toBe(
      'rgb(0, 0, 0)'
    );
    // Post author link color after hovering
    await communitiesPage.getFirstPostAuthor.hover();
    await communitiesPage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthor, 'color')).toBe(
      'rgb(220, 38, 38)'
    );

    // Timestamp link color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostCardTimestampLink, 'color')).toBe(
      'rgb(100, 116, 139)'
    );
    // Timestamp link color after hovering
    await communitiesPage.getFirstPostCardTimestampLink.hover();
    await communitiesPage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostCardTimestampLink, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    // Author reputation color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthorReputation, 'color')).toBe(
      'rgb(100, 116, 139)'
    );
    // Author reputation color after hovering
    await communitiesPage.getFirstPostAuthorReputation.hover();
    await communitiesPage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthorReputation, 'color')).toBe(
      'rgb(100, 116, 139)'
    );
  });

  test('validate the first post header styles (for Trending filter) in the dark theme', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Post author link color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthor, 'color')).toBe(
      'rgb(255, 255, 255)'
    );
    // Post author link color after hovering
    await communitiesPage.getFirstPostAuthor.hover();
    await communitiesPage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthor, 'color')).toBe(
      'rgb(220, 38, 38)'
    );

    // Timestamp link color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostCardTimestampLink, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    // Timestamp link color after hovering
    await communitiesPage.getFirstPostCardTimestampLink.hover();
    await communitiesPage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostCardTimestampLink, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    // Author reputation color without hovering
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthorReputation, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    // Author reputation color after hovering
    await communitiesPage.getFirstPostAuthorReputation.hover();
    await communitiesPage.page.waitForTimeout(1000);
    expect(await homePage.getElementCssPropertyValue(await communitiesPage.getFirstPostAuthorReputation, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
  });

  test('validate the first post footer payouts styles (for Trending filter) in the light theme in the LeoFinance', async ({ page }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Color of the first post payouts without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
    await homePage.getFirstPostPayout.hover();
    await homePage.page.waitForTimeout(1000);
    // Color of the first post payouts with hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    // The tooltip is visible by hovering
    expect(await homePage.getFirstPostPayoutTooltip).toBeVisible();
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'color')).toBe(
      'rgb(15, 23, 42)'
    );
  });

  test('validate the first post footer payouts styles (for Trending filter) in the dark theme in the LeoFinance', async ({ page }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    // Move to the dark theme
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Color of the first post payouts without hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(255, 255, 255)'
    );
    await homePage.getFirstPostPayout.hover();
    await homePage.page.waitForTimeout(1000);
    // Color of the first post payouts with hovering
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayout, 'color')).toBe(
      'rgb(220, 38, 38)'
    );
    // The tooltip is visible by hovering
    expect(await homePage.getFirstPostPayoutTooltip).toBeVisible();
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'color')).toBe(
      'rgb(148, 163, 184)'
    );
    expect(await homePage.getElementCssPropertyValue(await homePage.getFirstPostPayoutTooltip, 'background-color')).toBe(
      'rgb(3, 7, 17)'
    );
  });

  test.skip('validate the community leadership of Pinmapple Community', async ({ page, request }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToPinmappleCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('Pinmapple');

    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseCommunity = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: 'hive-163772', observer: '' } //hive-163772 - Pinmapple community owner
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const leadershipListApi = (await responseCommunity.json()).result.team;
    const leadershipListFrontElements = await communitiesPage.communityLeadershipList.all();

    // start from 1 index because 0 index it is owner 'hive-163772'
    const leadershipListApiNames: any[] = [];
    for (let i = 1; i < leadershipListApi.length; i++) {
      leadershipListApiNames.push(leadershipListApi[i][0] + ' ' + leadershipListApi[i][1]);
    }

    const leadershipListNamesFrontElements: any[] = [];
    for (const leadershipFront of leadershipListFrontElements) {
      leadershipListNamesFrontElements.push(await leadershipFront.textContent());
    }

    leadershipListNamesFrontElements.forEach((element, index) => {
      expect(element.toLocaleLowerCase()).toContain(String(leadershipListApiNames[index]));
    });
  });

  test('move to the first-three leadership profile pages of Pinmapple community ', async ({ page }) => {
    const homePage = new HomePage(page);
    const profilePage = new ProfilePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToPinmappleCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('Pinmapple');

    const leadershipLinkLists = await communitiesPage.communityLeadershipList.locator('a').all();

    const leadershipLinkNickNamesLists: any[] = [];
    leadershipLinkLists.forEach((nickNameLink) => {
      leadershipLinkNickNamesLists.push(nickNameLink.textContent());
    });

    for (let i = 0; i < leadershipLinkLists.length; i++) {
      if (i < 3) {
        leadershipLinkLists[i].click();
        await page.waitForSelector(profilePage.profileName['_selector']);
        expect(await profilePage.profileName).toBeVisible();
        await profilePage.profilePostsLink.click();
        await page.waitForSelector(profilePage.page.locator('[data-testid="user-post-menu"]')['_selector']);

        if ((await profilePage.page.locator('[data-testid="post-author"]').count()) > 0) {
          expect(await leadershipLinkNickNamesLists[i]).toContain(
            await profilePage.page.locator('[data-testid="post-author"]').first().textContent()
          );
        }

        await page.goBack();
        await page.goBack();
        await communitiesPage.quickValidataCommunitiesPageIsLoaded('Pinmapple');
      }
    }
  });
});
