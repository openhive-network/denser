import type { Page, Route } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectNotifyCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { TIMEOUTS } from '../support/constants';
import { NotificationsPage } from '../support/pages/notificationsPage';

/**
 * Notifications fixture suite — §14 Notifications (NOTIF-01, NOTIF-03, NOTIF-04).
 *
 * Deterministic, offline counterpart to the live `e2e/profileNotificationsPage`
 * suite. Notifications are SSR-fetched in
 * `app/[param]/(user-profile)/notifications/page.tsx` via
 * `bridge.account_notifications` (+ `bridge.unread_notifications`), all flowing
 * through the fixture proxy on :8200.
 *
 * We log in AS the profile owner ('gtg') so:
 *   - the account has rich, varied notifications (the live e2e uses gtg too),
 *     covering NOTIF-04's type assertions;
 *   - `accountOwner` is true, so the "Mark all as read" control renders and we
 *     can exercise NOTIF-03. (The seeded WIF only needs valid Hive format; it
 *     doesn't have to match the account — `verify_authority` is stubbed.)
 *
 * NOTIF-05 (live merge) overrides the browser's notification calls with
 * `page.route`, so it needs no extra recording: "Load more" and the
 * refreshed head page are synthesised from the recorded first page.
 *
 * NOTIF-02 ("Mark *individual* as read") is intentionally absent: the app has
 * no per-notification read control — only "mark all as read" exists
 * (notification-content.tsx). There is no feature to test.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright \
 *            --config=playwright.fixture.config.ts notifications
 * Replay:  pnpm --filter @hive/blog test:fixture -- notifications
 */

test.use({
  fixtureTestName: 'notifications',
  authenticatedUser: { username: 'gtg' }
});

const OWNER = 'gtg';
const FIXTURE_PROXY_PORT = 8200;
const UNREAD_POLL_MS = 20_000;
const LAST_READ = '2026-05-15 13:05:15';

interface RawNotification {
  id: string;
  msg: string;
  url: string;
  date: string;
  type: string;
  score: number;
}

const notification = (id: string, account: string, date: string): RawNotification => ({
  id,
  msg: `@${account} followed you`,
  url: `@${account}`,
  date,
  type: 'follow',
  score: 40
});

const OLDER_PAGE = [
  notification('1003', 'fixture-older-a', '2026-02-03T10:00:00'),
  notification('1002', 'fixture-older-b', '2026-02-02T10:00:00'),
  notification('1001', 'fixture-older-c', '2026-02-01T10:00:00')
];
const NEW_ITEMS = [
  notification('99999999999999902', 'fixture-new-a', '2026-05-30T10:00:00'),
  notification('99999999999999901', 'fixture-new-b', '2026-05-30T09:00:00')
];

/**
 * Serve the browser's `bridge.unread_notifications` / `account_notifications`
 * calls from test-controlled state: the unread count is `state.unread`, a
 * `last_id` page is `OLDER_PAGE`, and once `state.headHasNewItems` is set the
 * head page gains `NEW_ITEMS` on top (keeping its size). Counts head fetches.
 */
async function routeNotificationCalls(page: Page) {
  const state = { unread: 3, unreadCalls: 0, headCalls: 0, headHasNewItems: false };
  let recordedHead: RawNotification[] | null = null;

  const fulfill = (route: Route, id: unknown, result: unknown) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: id ?? 1, result })
    });

  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      const body: { method?: string; params?: { last_id?: unknown }; id?: unknown } | null =
        request.postDataJSON();

      if (body?.method === 'bridge.unread_notifications') {
        state.unreadCalls += 1;
        return fulfill(route, body.id, { unread: state.unread, lastread: LAST_READ });
      }
      if (body?.method !== 'bridge.account_notifications') return route.continue();
      if (body.params?.last_id !== undefined) return fulfill(route, body.id, OLDER_PAGE);

      state.headCalls += 1;
      if (!recordedHead) {
        const upstream = await route.fetch();
        const recorded: { result: RawNotification[] } = await upstream.json();
        recordedHead = recorded.result;
      }
      const head = state.headHasNewItems
        ? [...NEW_ITEMS, ...recordedHead.slice(0, recordedHead.length - NEW_ITEMS.length)]
        : recordedHead;
      return fulfill(route, body.id, head);
    }
  );
  return state;
}

test.describe('§14 Notifications', () => {
  let notifications: NotificationsPage;

  test.beforeEach(({ page }) => {
    notifications = new NotificationsPage(page);
  });

  // NOTIF-01 — View notifications: the page loads and lists notifications.
  test('NOTIF-01 notifications page loads and lists notifications', async ({ page }) => {
    await notifications.gotoLoggedIn(OWNER);

    await expect(page).toHaveURL(/\/@gtg\/notifications/);
    await expect(notifications.localMenu).toBeVisible();

    await expect(notifications.firstNotificationItem).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    expect(await notifications.notificationItems.count()).toBeGreaterThanOrEqual(1);
  });

  // NOTIF-04 — Notification types: the type tabs filter and display
  // vote / follow / reply (and more) notifications.
  test('NOTIF-04 type tabs display the different notification kinds', async () => {
    await notifications.gotoLoggedIn(OWNER);
    await expect(notifications.firstNotificationItem).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });

    // Tabs whose recorded data contains at least one item of that type.
    // Pinned from the committed fixture — re-recording may shift which
    // types are present in gtg's latest 50 notifications.
    const tabsWithItems: Array<{ name: string; type: string }> = [
      { name: 'Upvotes', type: 'upvotes' },
      { name: 'Follows', type: 'follows' },
      { name: 'Replies', type: 'replies' }
    ];

    for (const tab of tabsWithItems) {
      await notifications.tab(tab.name).click();
      const content = notifications.tabContent(tab.type);
      await expect(content).toBeVisible();
      await expect(
        content.getByTestId('notification-list-item').first()
      ).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    }
  });

  // NOTIF-03 — Mark all as read: clicking the control broadcasts a single
  // custom_json `["setLastRead", { date }]` (id "notify").
  test('NOTIF-03 mark all as read broadcasts setLastRead custom_json', async ({ page }) => {
    // observe:true on the mutation — WorkerBee needs the trx confirmed in a
    // synthetic block before onSuccess fires (same as §9 social ops).
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });

    await notifications.gotoLoggedIn(OWNER);

    // The control only renders for the account owner with unread > 0; the
    // committed unread_notifications fixture guarantees a non-zero count.
    await expect(notifications.markAllAsReadButton).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await notifications.markAllAsReadButton.click();

    await broadcast.waitForCount(1);
    expectNotifyCustomJson(broadcast.calls[0], { required_auth: OWNER });
  });

  // NOTIF-05 — Live update: when the unread count goes up while the page is
  // open, the head page is refetched and its new items merged on top of the
  // loaded list, keeping the pages loaded via "Load more". An unchanged or
  // lower count triggers no list fetch.
  test('NOTIF-05 a rising unread count merges new notifications above loaded pages', async ({
    page
  }) => {
    const calls = await routeNotificationCalls(page);
    await page.clock.install();
    await notifications.gotoLoggedIn(OWNER);
    await expect(notifications.notificationItems).toHaveCount(50, { timeout: TIMEOUTS.HYDRATION });
    const firstPageTop = await notifications.firstNotificationItem
      .getByTestId('notification-account-and-message')
      .innerText();

    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(notifications.notificationItems).toHaveCount(53);
    await expect(notifications.notificationItems.last()).toContainText('@fixture-older-c');

    const pollUnread = async () => {
      const before = calls.unreadCalls;
      await page.clock.fastForward(UNREAD_POLL_MS + 1000);
      await expect.poll(() => calls.unreadCalls).toBeGreaterThan(before);
    };

    await expect.poll(() => calls.unreadCalls).toBeGreaterThan(0);
    const headCallsBefore = calls.headCalls;
    await pollUnread();
    calls.unread = 2;
    await pollUnread();
    expect(calls.headCalls).toBe(headCallsBefore);

    calls.headHasNewItems = true;
    calls.unread = 4;
    await pollUnread();

    await expect(notifications.notificationItems).toHaveCount(55);
    await expect(notifications.notificationItems.nth(0)).toContainText('@fixture-new-a');
    await expect(notifications.notificationItems.nth(1)).toContainText('@fixture-new-b');
    await expect(notifications.notificationItems.nth(2)).toContainText(firstPageTop);
    await expect(notifications.notificationItems.last()).toContainText('@fixture-older-c');
    expect(calls.headCalls).toBe(headCallsBefore + 1);
  });
});
