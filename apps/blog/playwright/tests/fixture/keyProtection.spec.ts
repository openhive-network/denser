import type { Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { clickUntilOpen } from '../support/uiPrimitives';

/**
 * A WIF key an earlier version saved in plaintext is never deleted unasked: on load the reader is
 * asked to protect it with safe storage. "Not now" keeps it saved (it still signs) and the account
 * menu keeps a notice until it is moved or forgotten. "Forget saved key" there removes it and keeps
 * the session; signing out asks first, and Cancel keeps both the session and the key.
 *
 * The seeder stores the posting key in plaintext and answers the dialog "Not now" beforehand; the
 * answer is taken back on the first load here, as for a reader who was never asked.
 *
 * Fixtures: reuses `accountSwitchSafety` (read-only on replay) for a page with the site header.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- keyProtection
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchSafety recording');
test.use({ fixtureTestName: 'accountSwitchSafety', authenticatedUser: { authenticateOnBackend: true } });

const PAGE_WITH_HEADER = '/faq.html';
// The dialog follows the check whether safe storage holds the key already, which loads hb-auth
const DIALOG_TIMEOUT_MS = 30_000;
const POSTING_KEY_ENTRY = `wif.${DEFAULT_USER.username}@posting`;

async function readStoredKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage));
}

/** Opens the account menu on a page with the header; the seeded "Not now" keeps the load quiet */
async function openUserMenu(page: Page): Promise<ProfileUserMenu> {
  await page.goto(PAGE_WITH_HEADER);
  const profileMenu = new ProfileUserMenu(page);
  await clickUntilOpen(new HomePage(page).profileAvatarButton, profileMenu.profileMenuContent);
  return profileMenu;
}

test.describe('A WIF key saved in plaintext by an earlier version', () => {
  test('KEY-PROTECT-01 — asks to protect it on load; "Not now" keeps it and the account menu keeps a notice', async ({
    page,
    context
  }) => {
    await context.addInitScript((username) => {
      if (window.sessionStorage.getItem('key-protection-asked') !== null) return;
      window.sessionStorage.setItem('key-protection-asked', '1');
      window.localStorage.removeItem(`keyProtectionSnoozed.${username}`);
    }, DEFAULT_USER.username);
    await page.goto(PAGE_WITH_HEADER);

    const dialog = page.getByTestId('key-protection-dialog');
    await expect(dialog).toBeVisible({ timeout: DIALOG_TIMEOUT_MS });
    await expect(dialog).toContainText('Your key is saved unprotected');
    await dialog.getByTestId('key-protection-not-now').click();
    await expect(dialog).toHaveCount(0);

    expect(await readStoredKeys(page)).toEqual(
      expect.arrayContaining([POSTING_KEY_ENTRY, `keyProtectionSnoozed.${DEFAULT_USER.username}`])
    );
    const menu = new ProfileUserMenu(page).profileMenuContent;
    await clickUntilOpen(new HomePage(page).profileAvatarButton, menu);
    await expect(menu.getByTestId('key-protection-menu-item')).toBeVisible();
  });

  // The seeder saves the key again on every navigation: each check below reads storage before one
  test('KEY-PROTECT-02 — signing out asks first; Cancel keeps the session and the saved key', async ({ page }) => {
    const profileMenu = await openUserMenu(page);

    await profileMenu.logoutLink.click();
    const dialog = profileMenu.leaveSavedKeyDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`@${DEFAULT_USER.username}`);
    await expect(dialog.getByTestId('leave-saved-key-protect')).toBeVisible();
    await dialog.getByTestId('leave-saved-key-cancel').click();
    await expect(dialog).toHaveCount(0);

    expect(await readStoredKeys(page)).toEqual(expect.arrayContaining([POSTING_KEY_ENTRY, 'user']));
    await expect(new HomePage(page).profileAvatarButton).toBeVisible();
    await expect(new HomePage(page).loginBtn).toHaveCount(0);
  });

  test('KEY-PROTECT-03 — "Forget it and sign out" removes the saved key and signs out', async ({ page }) => {
    const profileMenu = await openUserMenu(page);
    const loggedOut = page.waitForResponse('**/api/auth/logout');

    await profileMenu.logoutLink.click();
    await profileMenu.leaveSavedKeyDialog.getByTestId('leave-saved-key-forget').click();
    await loggedOut;

    await expect(new HomePage(page).loginBtn).toBeVisible();
    await expect.poll(() => readStoredKeys(page)).not.toContain(POSTING_KEY_ENTRY);
  });

  test('KEY-PROTECT-04 — "Forget saved key" in the account menu removes the key after confirming and keeps the session', async ({
    page
  }) => {
    const profileMenu = await openUserMenu(page);

    await profileMenu.profileMenuContent.getByTestId('key-protection-forget-menu-item').click();
    const confirm = page.getByTestId('forget-saved-key-dialog');
    await expect(confirm).toContainText('Make sure you have another copy.');
    await confirm.getByTestId('forget-saved-key-confirm').click();
    await expect(confirm).toHaveCount(0);

    await expect.poll(() => readStoredKeys(page)).not.toContain(POSTING_KEY_ENTRY);
    await expect(new HomePage(page).loginBtn).toHaveCount(0);
    await clickUntilOpen(new HomePage(page).profileAvatarButton, profileMenu.profileMenuContent);
    await expect(profileMenu.profileUserName).toHaveText(DEFAULT_USER.username);
    await expect(profileMenu.profileMenuContent.getByTestId('key-protection-menu-item')).toHaveCount(0);
  });
});
