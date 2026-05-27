import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesExplorePage } from '../support/pages/communitiesExplorerPage';
import {
  SUBSCRIBER,
  COMMUNITY_TAG_SUBSCRIBED,
  COMMUNITY_NAME_SUBSCRIBED,
  ACTION_UNSUBSCRIBE,
  TOAST_UNSUBSCRIBED,
  gotoCommunitiesExplorerLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-05 — Leave a community from the /communities explorer card.
 *
 *   Wire — same custom_json shape as COM-03. The explorer card mounts the
 *          SAME `<SubscribeCommunity>` component as the community-page
 *          sidebar, so the unsubscribe payload and optimistic flip are
 *          byte-identical — only the entry route and locator path differ.
 *
 * Recorded against hive-167922 (LeoFinance), one of the 3 communities
 * guest4test is subscribed to on mainnet — so `context.subscribed: true`
 * comes through `bridge.list_communities` naturally and the card renders
 * the join/leave button without any overlay. The card is found inside the
 * default rank-sorted list (LeoFinance is in the recorded
 * `bridge.list_communities`); we don't type into `#search`, which only
 * re-queries on Enter and would need its own fixture.
 */

test.use({
  fixtureTestName: 'communityLeaveFromExplorer',
  authenticatedUser: {}
});

test('COM-05 — Leave community via /communities explorer card', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoCommunitiesExplorerLoggedIn(page);

  const explorer = new CommunitiesExplorePage(page);
  const card = explorer.cardByTitle(COMMUNITY_NAME_SUBSCRIBED);
  await expect(card).toBeVisible();
  const leaveBtn = explorer.joinedLeaveButtonIn(card);
  await expect(leaveBtn).toBeVisible();

  await leaveBtn.click();
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_UNSUBSCRIBE,
    payload: { community: COMMUNITY_TAG_SUBSCRIBED }
  });

  await expect(
    page.getByText(TOAST_UNSUBSCRIBED(COMMUNITY_TAG_SUBSCRIBED), { exact: true })
  ).toBeVisible();

  // The card flips back to Subscribe and the Joined/Leave button disappears.
  // This works because useUnsubscribeMutation.onSettled now patches the
  // ['communitiesList'] cache (context.subscribed=false), so the card's
  // useEffect recomputes isSubscribed=false instead of snapping back to the
  // stale subscribed=true. Asserted within the optimistic window (mirrors
  // COM-04); the 5s list_communities refetch reverts it afterwards.
  await expect(explorer.subscribeButtonIn(card)).toBeVisible();
  await expect(explorer.joinedLeaveButtonIn(card)).toBeHidden();
});
