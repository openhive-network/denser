import type { Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { clickUntilOpen } from '../support/uiPrimitives';

/**
 * A WIF key an earlier version saved in plaintext is never deleted unasked: on load the reader is
 * asked to protect it with safe storage. "Not now" keeps it saved (it still signs) and the account
 * menu keeps a notice until it is moved.
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
});
