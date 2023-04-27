import { test, expect, Locator } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
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

    const url = process.env.NEXT_PUBLIC_API_NODE_ENDPOINT;

    const responseCommunity = await request.post(`https://${url}/`, {
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

  test('validate the community leadership of LeoFinance Community', async ({
    page,
    request
  }) => {
    const homePage = new HomePage(page);
    const communitiesPage = new CommunitiesPage(page);

    await homePage.goto();
    await homePage.moveToLeoFinanceCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('LeoFinance');

    const url = process.env.NEXT_PUBLIC_API_NODE_ENDPOINT;

    const responseCommunity = await request.post(`https://${url}/`, {
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
    for(let i=1; i < leadershipListApi.length; i++){
        leadershipListApiNames.push(leadershipListApi[i][0] + ' ' + leadershipListApi[i][1])
    }

    leadershipListFrontElements.forEach(async (element, index) => {
        expect((await element.textContent()).toLocaleLowerCase()).toContain('@'+String(leadershipListApiNames[index]))
    })
  });
});
