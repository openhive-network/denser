import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';

/**
 * The Change Password page's two master-password fields are masked by default, carry the
 * autocomplete hint a password manager expects, and each has a show/hide toggle a keyboard user
 * can operate and a screen reader can read the state of. The API answers come from the stub node
 * (support/walletApiStub.ts).
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

const FIELDS = [
  { label: 'Current Master Password', autocomplete: 'current-password' },
  { label: 'Re-enter Generated Master Password', autocomplete: 'new-password' }
] as const;

test.describe('Change Password fields', () => {
  for (const [index, { label, autocomplete }] of FIELDS.entries()) {
    test(`WALLET-PASSWORD-0${index + 1} — "${label}" is masked with a keyboard show/hide toggle`, async ({
      page
    }) => {
      await logInAsStubAccount(page);
      await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/password`);

      const input = page.getByLabel(label);
      await expect(input).toHaveAttribute('type', 'password');
      await expect(input).toHaveAttribute('autocomplete', autocomplete);

      const toggle = input.locator('xpath=..').getByRole('button', { name: 'Show password' });
      await expect(toggle).toHaveAttribute('type', 'button');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await input.fill('P5secretvalue');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(input).toHaveAttribute('type', 'text');
      await expect(input).toHaveValue('P5secretvalue');

      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(input).toHaveAttribute('type', 'password');
    });
  }
});
