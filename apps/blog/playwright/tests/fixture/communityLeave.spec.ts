import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import {
  SUBSCRIBER,
  COMMUNITY_TAG_SUBSCRIBED,
  ACTION_UNSUBSCRIBE,
  TOAST_UNSUBSCRIBED,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-03 — Leave a community via the community page.
 *
 *   Wire — custom_json id="community", json: ["unsubscribe", { community }].
 *   Toast — "You have successfully unsubscribed from hive-XXXXXX." (raw
 *           tag, not title — asymmetric vs the subscribe path, see
 *           use-subscribe-mutations.ts:134).
 *   UI — `community-join-leave-button` disappears, `community-subscribe-button`
 *        renders (via optimistic `context.subscribed = false` write in
 *        useUnsubscribeMutation.onSettled).
 *
 * Recording is taken against hive-167922 (LeoFinance) where the seeded
 * user guest4test is subscribed on mainnet — so `context.subscribed: true`
 * comes out of `bridge.get_community` naturally, no overlay needed.
 */

test.use({
  fixtureTestName: 'communityLeave',
  authenticatedUser: {}
});

test('COM-03 — Leave community via community page', async ({ page }) => {
  // confirmInBlock: useUnsubscribeMutation runs transactionService.unsubscribe
  // with { observe: true } — WorkerBee needs the captured trx delivered in
  // a synthetic block before onSuccess fires.
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG_SUBSCRIBED);

  const community = new CommunitiesPage(page);
  await expect(community.communityJoinedLeaveButton).toBeVisible();

  await community.communityJoinedLeaveButton.click();
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_UNSUBSCRIBE,
    payload: { community: COMMUNITY_TAG_SUBSCRIBED }
  });

  await expect(
    page.getByText(TOAST_UNSUBSCRIBED(COMMUNITY_TAG_SUBSCRIBED), { exact: true })
  ).toBeVisible();
  await expect(community.communitySubscribeButton).toBeVisible();
});

test('COM-03b — Leave stays left with a short note when no block confirms it in time', async ({ page }) => {
  // No confirmInBlock: the node takes the broadcast, and the head block is "not available yet" on
  // every poll (as on a lagging node), so WorkerBee's listener expires after expireInMs (10 s).
  const broadcast = await installBroadcastInterceptor(page);
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === '8200',
    (route) => {
      const body = route.request().postDataJSON() as { method?: string; id?: number } | null;
      if (body?.method !== 'block_api.get_block') return route.fallback();
      return route.fulfill({ json: { jsonrpc: '2.0', id: body.id ?? 1, result: {} } });
    }
  );
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG_SUBSCRIBED);

  const community = new CommunitiesPage(page);
  await community.communityJoinedLeaveButton.click();
  await broadcast.waitForCount(1);

  await expect(page.getByTestId('transaction-not-confirmed-message')).toBeVisible({ timeout: 20_000 });
  await expect(community.communitySubscribeButton).toBeVisible();
  await expect(page.getByText('listener has expired')).toHaveCount(0);
});
