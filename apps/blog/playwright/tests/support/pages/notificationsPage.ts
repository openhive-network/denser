import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants';

/**
 * Page Object Model for the user-profile notifications page
 * (`/@<user>/notifications`).
 *
 * Mirrors the testids rendered by `features/activity-log/notification-content.tsx`
 * (the local tab menu, per-type tab panels) and `list-item.tsx`
 * (`notification-list-item`). The "Mark all as read" control is a plain
 * `<button>` that only renders for the account owner with a non-zero unread
 * count, so it's exposed via its accessible name rather than a testid.
 */
export class NotificationsPage {
  readonly page: Page;

  readonly localMenu: Locator;
  readonly notificationItems: Locator;
  readonly firstNotificationItem: Locator;
  readonly markAllAsReadButton: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.localMenu = page.getByTestId('notifications-local-menu');
    this.notificationItems = page.getByTestId('notification-list-item');
    this.firstNotificationItem = this.notificationItems.first();
    this.markAllAsReadButton = page.getByRole('button', { name: 'Mark all as read' });
    this.loginButton = page.getByTestId('login-btn');
  }

  /**
   * Navigate to a user's notifications page and wait for App Router
   * hydration to settle on the logged-in branch (login button hidden).
   */
  async gotoLoggedIn(username: string) {
    await this.page.goto(`/@${username}/notifications`);
    await expect(this.loginButton).toBeHidden({ timeout: TIMEOUTS.HYDRATION });
  }

  /** Tab trigger by its visible label (e.g. 'Upvotes', 'Follows', 'Replies'). */
  tab(name: string): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** Tab panel by its content testid suffix (e.g. 'upvotes', 'follows'). */
  tabContent(type: string): Locator {
    return this.page.getByTestId(`notifications-content-${type}`);
  }
}
