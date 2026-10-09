import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, STUB_FOLLOWED, STUB_PROPOSAL_SUBJECT, startWalletApiStub } from '../support/walletApiStub';

/**
 * The wallet's `@hive/ui` Radix and cmdk primitives, driven with mouse and keyboard: the proposals
 * status Select (Radix Select 2), the theme toggle's DropdownMenu (Radix DropdownMenu 2.1 +
 * next-themes 0.4), and the owner's balance DropdownMenu, whose Transfer entry opens a Dialog with
 * the cmdk 1 recipient autocompleter. Each test checks where focus goes, that the chosen value is
 * applied, and that the page logs no console error or warning (but for the failed loads of
 * off-origin resources the offline run cannot reach). The API answers come from the stub node
 * (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/** A resource the offline run cannot fetch (anything off the wallet and the stub node); Chromium logs each as a console error. */
const isOfflineLoadFailure = (text: string, url: string) =>
  text.startsWith('Failed to load resource: net::') && !LOCAL_HOSTS.includes(new URL(url).hostname);

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

let consoleProblems: string[];

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  consoleProblems = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const { url } = msg.location();
    if (url && isOfflineLoadFailure(msg.text(), url)) return;
    consoleProblems.push(`[${msg.type()}] ${msg.text()} (${url})`);
  });
  page.on('pageerror', (err) => consoleProblems.push(`[pageerror] ${err.message}`));
});

test.afterEach(() => {
  expect(consoleProblems, consoleProblems.join('\n')).toEqual([]);
});

/** Logs STUB_ACCOUNT in on the client, as the blog's fixture seeder does: the stored user is what `useUser` starts from. */
const logInAsStubAccount = (page: Page) =>
  page.context().addInitScript((username) => {
    window.localStorage.setItem(
      'user',
      JSON.stringify({
        isLoggedIn: true,
        username,
        avatarUrl: '',
        loginType: 'wif',
        keyType: 'posting',
        authenticateOnBackend: false,
        chatAuthToken: '',
        oauthConsent: {},
        strict: false
      })
    );
  }, STUB_ACCOUNT);

/** Opens `opened` through `open`, retried: an action that lands before hydration attached the handlers is lost. */
const openWith = async (open: () => Promise<void>, opened: Locator) => {
  await expect(async () => {
    await open();
    await expect(opened).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
};

const focusIsInside = (container: Locator) => container.evaluate((element) => element.contains(document.activeElement));

test.describe('Wallet Radix and cmdk primitives', () => {
  test('WALLET-UI-01 — the proposals status Select opens, moves and applies with the keyboard and the mouse', async ({
    page
  }) => {
    await page.goto(`${WALLET_BASE_PATH}/proposals`);
    await expect(page.getByTestId('proposal-title')).toContainText(STUB_PROPOSAL_SUBJECT);
    const trigger = page.getByTestId('proposals-sort-filter-status');
    const list = page.getByTestId('proposals-sort-filter-status-conntent');
    await expect(trigger).toHaveText('Votable');

    await openWith(() => trigger.press('Enter'), list);
    await expect(page.getByRole('option', { name: 'Votable', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Votable');

    await trigger.press('Enter');
    await page.keyboard.press('Home');
    await expect(page.getByRole('option', { name: 'All', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Active', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(list).toBeHidden();
    await expect(trigger).toHaveText('Active');
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(page.getByRole('option', { name: 'Active', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('option', { name: 'Expired', exact: true }).click();
    await expect(list).toBeHidden();
    await expect(trigger).toHaveText('Expired');
    await expect(page.getByTestId('proposal-title')).toContainText(STUB_PROPOSAL_SUBJECT);
  });

  test('WALLET-UI-02 — the theme menu opens and picks Dark with the keyboard, Esc returns focus, and Light applies with the mouse', async ({
    page
  }) => {
    await page.goto(`${WALLET_BASE_PATH}/proposals`);
    const trigger = page.getByTestId('theme-mode');
    const menu = page.getByRole('menu');

    await openWith(() => trigger.press('Enter'), menu);
    await expect(page.getByRole('menuitem', { name: 'Light' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.press('Enter');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Dark' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await trigger.click();
    await page.getByRole('menuitem', { name: 'Light' }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
  });

  test('WALLET-UI-03 — the balance menu opens the transfer dialog, whose cmdk autocompleter picks a recipient with the keyboard and the mouse', async ({
    page
  }) => {
    await logInAsStubAccount(page);
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    const menuTrigger = page.getByTestId('wallet-hive-value').getByRole('button');
    const menu = page.getByRole('menu');
    const dialog = page.getByRole('dialog');
    // The dialog's currency Select is a combobox too: the recipient is the cmdk input
    const recipient = dialog.locator('input[cmdk-input]');
    const suggestion = dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` });

    await openWith(() => menuTrigger.press('Enter'), menu);
    await expect(page.getByRole('menuitem', { name: 'Market' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(menuTrigger).toBeFocused();

    await menuTrigger.click();
    await menu.getByText('Transfer', { exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Transfer To Account' })).toBeVisible();
    expect(await focusIsInside(dialog), 'focus moved into the dialog').toBe(true);

    await recipient.fill('stub-f');
    await suggestion.click();
    await expect(recipient).toHaveValue(STUB_FOLLOWED);

    await recipient.fill('stub-f');
    await expect(suggestion).toHaveAttribute('aria-selected', 'true');
    await recipient.press('Enter');
    await expect(recipient).toHaveValue(STUB_FOLLOWED);
    // Enter picks the suggestion and closes the list: it neither submits the form nor closes the dialog
    await expect(suggestion).toBeHidden();
    await expect(dialog).toBeVisible();

    await recipient.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
