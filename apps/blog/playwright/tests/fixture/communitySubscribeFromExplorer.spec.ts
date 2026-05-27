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
 *   Wire — same custom_json shape as COM-02. The explorer card mounts the
 *          SAME `<SubscribeCommunity>` component (subscribe-community.tsx)
 *          as the community page's sidebar, so the broadcast payload and
 *          optimistic UI flip are byte-identical.
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

  // Optimistic flip on the SAME card. CommunitiesListItem holds its own
  // `isSubscribed` useState and the subscribe handler calls
  // onIsSubscribed(true) (subscribe-community.tsx) — so the card swaps to
  // the join/leave button from local component state. The explorer reads
  // ['communitiesList'], NOT the ['community', X] cache that
  // useSubscribeMutation.onSettled rewrites, so that rewrite doesn't drive
  // this flip.
  await expect(explorer.joinedLeaveButtonIn(card)).toBeVisible();
});
