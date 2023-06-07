import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import { CommunitiesPage } from '../support/pages/communitiesPage';

test.describe('Communities page tests', () => {
  test('is LeoFinance community page loaded', async ({ page }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');
  });

  test('validate the community subscribers, pending rewards, active posters are valid in LeoFinance Community', async ({
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

  test('validate the community leadership of LeoFinance Community', async ({ page, request }) => {
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

  // Skipped - it needs improvements
  test.skip('move to the profile leadership pages of LeoFinance community ', async ({ page }) => {
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
      await page.waitForSelector(profilePage.profileNickName['_selector']);
      expect(await profilePage.profileNickName.textContent()).toBe(await leadershipLinkNickNamesLists[i]);
      await page.goBack();
      await communitiesPage.quickValidataCommunitiesPageIsLoaded('LeoFinance');
    }
  });

  test('validate the community leadership of Pinmapple Community', async ({ page, request }) => {
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

  // Skipped - It needs improvements
  test.skip('move to the first-three leadership profile pages of Pinmapple community ', async ({ page }) => {
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
        await page.waitForSelector(profilePage.profileNickName['_selector']);
        expect(await profilePage.profileNickName.textContent()).toBe(await leadershipLinkNickNamesLists[i]);
        await page.goBack();
        await communitiesPage.quickValidataCommunitiesPageIsLoaded('Pinmapple');
      }
    }
  });
});
