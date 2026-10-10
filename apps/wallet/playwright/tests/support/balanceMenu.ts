import { expect, type Locator, type Page } from '@playwright/test';

const HYDRATION_TIMEOUT = 30_000;

/**
 * Opens the owner's balance dropdown at `trigger` on the transfers page, picks its `item` and
 * resolves with the dialog titled `dialogName` that it opens. The menu is retried until hydration
 * has attached its handlers.
 */
export const openBalanceMenuDialog = async (
  page: Page,
  trigger: Locator,
  item: string,
  dialogName: string
): Promise<Locator> => {
  const menu = page.getByRole('menu');
  await expect(async () => {
    await trigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText(item, { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: dialogName, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};
