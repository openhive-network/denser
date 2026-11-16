import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesExplorePage } from '../support/pages/communitiesExplorerPage';
import {
  SUBSCRIBER,
  COMMUNITY_TAG,
  COMMUNITY_NAME,
  ACTION_SUBSCRIBE,
  TOAST_SUBSCRIBED,
  gotoCommunitiesExplorerLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-04 — Subscribe to community from the /communities explorer card.
 *
 *   Wire — same custom_json shape as COM-02. The explorer's shared handler
 *          (use-communities-subscription.ts) calls the SAME
 *          `useSubscribeMutation` as the community page's sidebar, so the
 *          broadcast payload is byte-identical.
 *   Variant — entry point is `/communities`, click target lives inside a
 *             `community-list-item` card found by its title text.
 *
 * The card is located inside the default rank-sorted list — the recorded
 * `bridge.list_communities` fixture already contains Photography Lovers.
 * We don't type into `#search`: it only re-queries on Enter
 * (content.tsx `handleSearchCommunity`), and a filtered query would need
 * its own fixture recording.
 */

test.use({
  fixtureTestName: 'communitySubscribeFromExplorer',
  authenticatedUser: {}
});

test('COM-04 — Subscribe to community via /communities explorer card', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoCommunitiesExplorerLoggedIn(page);

  const explorer = new CommunitiesExplorePage(page);
  const card = explorer.cardByTitle(COMMUNITY_NAME);
  await expect(card).toBeVisible();
  const subscribeBtn = explorer.subscribeButtonIn(card);
  await expect(subscribeBtn).toBeVisible();

  await subscribeBtn.click();
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_SUBSCRIBE,
    payload: { community: COMMUNITY_TAG }
  });

  await expect(
    page.getByText(TOAST_SUBSCRIBED(COMMUNITY_NAME), { exact: true })
  ).toBeVisible();

  // Flip on the SAME card. The card's state is derived from the
  // ['communitiesList'] and ['subscriptions', user] caches, which
  // useSubscribeMutation's onSuccess patches (subscription-cache.ts), so
  // the card swaps to the join/leave button once the broadcast lands.
  await expect(explorer.joinedLeaveButtonIn(card)).toBeVisible();
});
