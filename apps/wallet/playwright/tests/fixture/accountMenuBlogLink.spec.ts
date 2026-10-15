import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { FIXTURE_BLOG_URL, WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * The account menu has a "Blog" item, the counterpart of the blog menu's "Wallet" item: the link is
 * the menu item itself, so the keyboard reaches it and Enter opens the account's blog in a new tab.
 * Reads come from the stub node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
const MAX_ARROW_PRESSES = 10;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

test('WALLET-MENU-BLOG-01 — Enter on the account menu Blog item opens the account blog in a new tab', async ({
  page,
  context
}) => {
  const blogUrl = `${FIXTURE_BLOG_URL}/@${STUB_ACCOUNT}`;
  // Nothing serves the blog here; only the URL the new tab asks for matters
  await context.route(blogUrl, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  await logInAsStubAccount(page, { loginType: 'hbauth', keyType: 'active' });
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const avatar = page.getByTestId('profile-avatar-button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await avatar.focus();
    await avatar.press('Enter');
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

  const blogItem = menu.getByRole('menuitem', { name: enWallet.navigation.user_menu.blog, exact: true });
  await expect(blogItem).toHaveAttribute('href', blogUrl);
  for (let press = 0; press < MAX_ARROW_PRESSES; press++) {
    if (await blogItem.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(blogItem).toBeFocused();

  const [blogTab] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('Enter')]);
  await blogTab.waitForURL(blogUrl);
  await expect(menu).toBeHidden();
});
