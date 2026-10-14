import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { FIXTURE_BLOG_URL, WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';

/**
 * The profile navigation's "Blog" link opens the account's blog under the blog's base path (#1193):
 * `new URL('/@user', 'https://h/blog')` drops `/blog` and lands on the blog's front page. The API
 * answers come from the stub node (support/walletApiStub.ts).
 */

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

test('WALLET-BLOGLINK-01 — the profile Blog link keeps the blog base path', async ({ page }) => {
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const blogLink = page.getByTestId('profile-navigation').getByRole('link').first();
  await expect(blogLink).toHaveAttribute('href', `${FIXTURE_BLOG_URL}/@${STUB_ACCOUNT}`);
});
