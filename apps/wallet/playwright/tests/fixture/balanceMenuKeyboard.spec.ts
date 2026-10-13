import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';

/**
 * The owner's balance menus on the transfers page follow the WAI-ARIA menu pattern: every action is
 * a menu item reachable with the arrow keys, Enter or Space opens its dialog, which is modal and
 * named, and closing the dialog puts focus back on the balance button. Reads come from the stub
 * node (support/walletApiStub.ts).
 */

const HYDRATION_TIMEOUT = 30_000;

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
  await logInAsStubAccount(page, 'active');
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
});

const savingsButtons = (page: Page) =>
  page.getByRole('row').filter({ has: page.getByTestId('wallet-savings-description') }).getByRole('button');

const BALANCE_MENUS: { balance: string; trigger: (page: Page) => Locator; actions: string[] }[] = [
  {
    balance: 'HIVE',
    trigger: (page) => page.getByTestId('wallet-hive-value').getByRole('button'),
    actions: ['Transfer', 'Transfer to savings', 'Power up', 'Market']
  },
  {
    balance: 'HIVE POWER',
    trigger: (page) => page.getByTestId('wallet-hive-power').getByRole('button'),
    actions: ['Power Down', 'Delegate']
  },
  {
    balance: 'HIVE DOLLARS',
    trigger: (page) => page.getByTestId('wallet-hive-dallars-value').getByRole('button'),
    actions: ['Transfer', 'Transfer to savings', 'Market']
  },
  {
    balance: 'Savings HIVE',
    trigger: (page) => savingsButtons(page).nth(0),
    actions: ['Withdraw HIVE']
  },
  {
    balance: 'Savings HBD',
    trigger: (page) => savingsButtons(page).nth(1),
    actions: ['Withdraw HIVE DOLLARS']
  }
];

/**
 * Opens the menu of `trigger` from the keyboard, retried until hydration attached its handlers, and
 * waits for focus to land on its first item.
 */
const openMenuWithKeyboard = async (page: Page, trigger: Locator): Promise<Locator> => {
  const menu = page.getByRole('menu');
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await trigger.focus();
      await page.keyboard.press('Enter');
    }
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  return menu;
};

test.describe('Balance menus from the keyboard', () => {
  for (const { balance, trigger, actions } of BALANCE_MENUS) {
    test(`WALLET-A11Y-BALANCE-MENU-01 — every action of the ${balance} menu is a menu item the arrows reach`, async ({
      page
    }) => {
      const menu = await openMenuWithKeyboard(page, trigger(page));
      const items = menu.getByRole('menuitem');

      await expect(items).toHaveText(actions);
      await page.keyboard.press('End');
      await expect(items.last()).toBeFocused();
      await page.keyboard.press('Home');
      await expect(items.first()).toBeFocused();
      if (actions.length > 1) {
        await page.keyboard.press('ArrowDown');
        await expect(items.nth(1)).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(items.first()).toBeFocused();
      }
    });
  }

  test('WALLET-A11Y-BALANCE-MENU-02 — Enter opens the transfer dialog, modal and with named fields; Escape returns focus to the balance', async ({
    page
  }) => {
    const balanceButton = page.getByTestId('wallet-hive-value').getByRole('button');
    await openMenuWithKeyboard(page, balanceButton);
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Transfer To Account', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(dialog.getByRole('combobox', { name: 'To', exact: true })).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Currency', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(balanceButton).toBeFocused();
  });

  test('WALLET-A11Y-BALANCE-MENU-03 — Space opens the savings withdrawal; Escape returns focus to the savings balance', async ({
    page
  }) => {
    const balanceButton = savingsButtons(page).nth(1);
    await openMenuWithKeyboard(page, balanceButton);
    await page.keyboard.press('Space');

    const dialog = page.getByRole('dialog', { name: 'Savings Withdraw', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('combobox', { name: 'Currency', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(balanceButton).toBeFocused();
  });

  test('WALLET-A11Y-BALANCE-MENU-04 — backing out of the confirmation and the transfer to savings returns focus to the balance', async ({
    page
  }) => {
    const balanceButton = page.getByTestId('wallet-hive-value').getByRole('button');
    const menu = await openMenuWithKeyboard(page, balanceButton);
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem', { name: 'Transfer to savings', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Transfer To Savings', exact: true });
    await dialog.getByPlaceholder('Amount').fill('1');
    await dialog.getByRole('button', { name: 'Next' }).click();
    const confirm = page.getByRole('dialog', { name: 'Confirm Transfer To Savings' });
    await expect(confirm).toHaveAttribute('aria-modal', 'true');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(balanceButton).toBeFocused();
  });
});
