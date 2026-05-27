import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import {
  SUBSCRIBER,
  COMMUNITY_TAG,
  COMMUNITY_NAME,
  ACTION_SUBSCRIBE,
  TOAST_SUBSCRIBED,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-02 — Subscribe to community from the community page.
 *
 *   Wire — custom_json id="community", json: ["subscribe", { community }].
 *   Toast — "You have successfully subscribed to <Community Title>." (Note:
 *           subscribe toast uses *title*; unsubscribe toast uses *tag*.
 *           See use-subscribe-mutations.ts:63 vs :134.)
 *   UI — `community-subscribe-button` flips out, `community-join-leave-button`
 *        renders (via optimistic `context.subscribed = true` write in
 *        useSubscribeMutation.onSettled).
 */

test.use({
  fixtureTestName: 'communitySubscribe',
  authenticatedUser: {}
});

test('COM-02 — Subscribe to community via community page', async ({ page }) => {
  // confirmInBlock IS MANDATORY: useSubscribeMutation runs
  // transactionService.subscribe(..., { observe: true }), so WorkerBee
  // needs the captured trx delivered in a synthetic block before
  // onSuccess fires the toast and invalidates the cache.
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG);

  const community = new CommunitiesPage(page);
  await expect(community.communitySubscribeButton).toBeVisible();

  await community.communitySubscribeButton.click();
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_SUBSCRIBE,
    payload: { community: COMMUNITY_TAG }
  });

  await expect(
    page.getByText(TOAST_SUBSCRIBED(COMMUNITY_NAME), { exact: true })
  ).toBeVisible();
  await expect(community.communityJoinedLeaveButton).toBeVisible();
});
