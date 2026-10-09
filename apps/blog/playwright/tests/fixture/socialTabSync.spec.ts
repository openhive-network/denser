import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  type BroadcastInterceptor
} from '../support/fixture-auth/broadcast-interceptor';
import { UserListPage } from '../support/pages/userListPage';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { FOLLOWER, FOLLOW_TARGET_USER, gotoOwnList } from '../support/followMuteContext';

/**
 * Two tabs of one browser stay in sync without a reload: a list change made in
 * one tab reaches the other through the `denser-social` BroadcastChannel, and a
 * logout in one tab reaches the other through the `storage` event on `user`.
 *
 * Both pages share one context, so they share localStorage, cookies and the
 * BroadcastChannel origin, as two tabs do.
 */

test.use({
  fixtureTestName: 'socialMutedListPage',
  authenticatedUser: {}
});

/**
 * After `broadcast` captured a mute, `page`'s `bridge.get_follow_list(FOLLOWER, muted)`
 * answers with `muted` in it, as the chain does once the mute is indexed. The
 * recording holds the empty pre-mute list.
 */
async function installMutedListIndex(page: Page, broadcast: BroadcastInterceptor, muted: string) {
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === '8200',
    async (route) => {
      const body = route.request().postDataJSON() as {
        method?: string;
        params?: { observer?: string; follow_type?: string };
      } | null;
      if (
        broadcast.calls.length === 0 ||
        body?.method !== 'bridge.get_follow_list' ||
        body.params?.observer !== FOLLOWER ||
        body.params?.follow_type !== 'muted'
      ) {
        return route.fallback();
      }
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: [{ name: muted, blacklist_description: '', muted_list_description: '' }]
        })
      });
    }
  );
}

test('TABSYNC-01 — muting in one tab shows in the other tab without reload', async ({ context }) => {
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  const broadcast = await installBroadcastInterceptor(pageA, undefined, { confirmInBlock: true });
  await installMutedListIndex(pageB, broadcast, FOLLOW_TARGET_USER);

  await gotoOwnList(pageB, 'muted');
  const listB = new UserListPage(pageB);
  await expect(listB.emptyState).toBeVisible();

  await gotoOwnList(pageA, 'muted');
  await new UserListPage(pageA).addAccount(FOLLOW_TARGET_USER);
  await broadcast.waitForCount(1);

  await expect(listB.itemRow(FOLLOW_TARGET_USER)).toBeVisible();
  await expect(listB.items).toHaveCount(1);
});

test('TABSYNC-02 — logging out in one tab logs out the other tab', async ({ context }) => {
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  await gotoOwnList(pageB, 'muted');
  await gotoOwnList(pageA, 'muted');
  const headerB = new HomePage(pageB);
  await expect(headerB.profileAvatarButton).toBeVisible();

  const headerA = new HomePage(pageA);
  await headerA.profileAvatarButton.click();
  await new ProfileUserMenu(pageA).logoutLink.click();
  await expect(headerA.loginBtn).toBeVisible();

  await expect(headerB.loginBtn).toBeVisible();
  await expect(headerB.profileAvatarButton).toBeHidden();
});
