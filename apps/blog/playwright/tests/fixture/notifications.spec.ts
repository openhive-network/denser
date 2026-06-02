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
});
