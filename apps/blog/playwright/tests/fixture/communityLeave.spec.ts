import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import {
  SUBSCRIBER,
  COMMUNITY_TAG_SUBSCRIBED,
  COMMUNITY_NAME_SUBSCRIBED,
  ACTION_UNSUBSCRIBE,
  TOAST_UNSUBSCRIBED,
  TOAST_UNSUBSCRIBED_PL,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-03 — Leave a community via the community page.
 *
 *   Wire — custom_json id="community", json: ["unsubscribe", { community }].
 *   Toast — "You have successfully unsubscribed from <title>." in the
 *           reader's locale (COM-03-pl checks the Polish one).
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
    page.getByText(TOAST_UNSUBSCRIBED(COMMUNITY_NAME_SUBSCRIBED), { exact: true })
  ).toBeVisible();
  await expect(community.communitySubscribeButton).toBeVisible();
});

test('COM-03-pl — the leave toast is Polish and names the community by its title', async ({
  page,
  baseURL
}) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG_SUBSCRIBED);

  const community = new CommunitiesPage(page);
  await community.communityJoinedLeaveButton.click();
  await broadcast.waitForCount(1);

  await expect(
    page.getByText(TOAST_UNSUBSCRIBED_PL(COMMUNITY_NAME_SUBSCRIBED), { exact: true })
  ).toBeVisible();
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

/** Longer than the browser's request timeout (`apiTimeout`, 5 s), so wax gives up on the broadcast. */
const BROADCAST_HOLD_MS = 8_000;

test('COM-03c — a leave whose broadcast request times out shows the may-still-apply note and ends left', async ({
  page,
  baseURL
}) => {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);
  // The node never answers the broadcast; it did apply it, so reads after it show the community left
  const state = { broadcasts: 0, readsAfterBroadcast: 0 };
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === '8200',
    async (route) => {
      const body = route.request().postDataJSON() as { method?: string; id?: number } | null;
      const id = body?.id ?? 1;
      if (/broadcast_transaction(_synchronous)?$/.test(body?.method ?? '')) {
        state.broadcasts++;
        await new Promise((resolve) => setTimeout(resolve, BROADCAST_HOLD_MS));
        return route.abort().catch(() => undefined);
      }
      if (body?.method === 'database_api.verify_authority') {
        return route.fulfill({ json: { jsonrpc: '2.0', id, result: { valid: true } } });
      }
      // No block confirms it either, as on COM-03b
      if (body?.method === 'block_api.get_block') {
        return route.fulfill({ json: { jsonrpc: '2.0', id, result: {} } });
      }
      if (state.broadcasts === 0) return route.fallback();
      if (body?.method === 'bridge.get_community') {
        state.readsAfterBroadcast++;
        const response = await route.fetch();
        const json = await response.json();
        if (json.result?.context) json.result.context = { ...json.result.context, subscribed: false, role: '' };
        return route.fulfill({ response, json });
      }
      if (body?.method === 'bridge.list_all_subscriptions') {
        const response = await route.fetch();
        const json = await response.json();
        if (Array.isArray(json.result)) {
          json.result = json.result.filter((sub: unknown[]) => sub[0] !== COMMUNITY_TAG_SUBSCRIBED);
        }
        return route.fulfill({ response, json });
      }
      return route.fallback();
    }
  );
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG_SUBSCRIBED);

  const community = new CommunitiesPage(page);
  await community.communityJoinedLeaveButton.click();

  await expect(page.getByTestId('transaction-not-confirmed-message')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('transaction-not-confirmed-id')).toHaveText(/^[0-9a-f]{40}$/);
  expect(state.broadcasts).toBe(1);
  // The delayed refresh reads the chain's state: still left
  await expect.poll(() => state.readsAfterBroadcast, { timeout: 15_000 }).toBeGreaterThan(0);
  await expect(community.communitySubscribeButton).toHaveText('Subskrybuj');
  await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
  await expect(page.getByText(/Request timed out|WaxError/)).toHaveCount(0);
});
