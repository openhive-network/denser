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
