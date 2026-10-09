import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';
import { STUB_WITNESSES } from '../support/witnessApiStub';
import { DEFAULT_AVATAR_URL, failAvatarRequests } from '../support/avatarImages';

/**
 * A user avatar that fails to load falls back to the default avatar (#868). The API answers come
 * from the stub node (support/walletApiStub.ts); every avatar request is answered with a 404.
 */

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  await failAvatarRequests(page);
});

test.describe('Avatar fallback', () => {
  test('WALLET-AVATAR-01 — the profile header avatar is swapped to the default avatar', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    await expect(page.getByTestId('profile-avatar')).toHaveAttribute('src', DEFAULT_AVATAR_URL);
  });

  test('WALLET-AVATAR-02 — a witness avatar is swapped to the default avatar', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/~witnesses`);

    const avatar = page.getByAltText(`${STUB_WITNESSES[0].owner} profile picture`);
    await expect(avatar).toHaveAttribute('src', DEFAULT_AVATAR_URL);
  });

  test('WALLET-AVATAR-03 — a proposal creator avatar is swapped to the default avatar', async ({ page }) => {
    await page.goto(`${WALLET_BASE_PATH}/proposals`);

    const avatar = page.getByAltText(`${STUB_ACCOUNT} profile picture`).first();
    await expect(avatar).toHaveAttribute('src', DEFAULT_AVATAR_URL);
  });
});
