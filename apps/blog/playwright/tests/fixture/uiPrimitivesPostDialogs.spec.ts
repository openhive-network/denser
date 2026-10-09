import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import { gotoPostLoggedIn } from '../support/reblogShareContext';
import {
  clickOutside,
  clickUntilOpen,
  collectConsoleProblems,
  expectFocusTrappedIn
} from '../support/uiPrimitives';

/**
 * The post page's dialogs, driven with mouse and keyboard by a logged-in user: the reblog
 * confirmation (`@hive/ui` AlertDialog) and the share dialog (`@hive/ui` Dialog). Each test checks
 * that focus is trapped inside, every way of closing works (and, for the alert dialog, that a click
 * outside does not close it and that dismissing it broadcasts nothing), and that the page logs no
 * console error or warning on the way.
 *
 * The share dialog's trigger is an icon, not keyboard-reachable, so that dialog is opened with the
 * mouse and the keyboard is checked inside it.
 *
 * Fixtures: reuses `reblogShare` (read-only on replay), whose RBL-01 / SHARE-01 open the same two
 * dialogs on the same post.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- uiPrimitivesPostDialogs
 */

test.use({ fixtureTestName: 'reblogShare', authenticatedUser: {} });
test.skip(isRecordMode, 'replay-only: shares the reblogShare recording');

test.describe('Radix primitives — post page dialogs, logged in', () => {
  let consoleProblems: string[];

  test.beforeEach(async ({ page }) => {
    consoleProblems = collectConsoleProblems(page);
  });

  test.afterEach(() => {
    expect(consoleProblems, consoleProblems.join('\n')).toEqual([]);
  });

  test('UI-ALERT-01 — the reblog alert dialog opens with mouse and keyboard, traps focus, ignores a click outside, and Esc, Cancel and X dismiss it without a broadcast', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    const postPage = new PostPage(page);
    const trigger = page.getByRole('button').filter({ has: postPage.footerReblogIcon });
    const dialog = page.getByRole('alertdialog');

    await clickUntilOpen(postPage.footerReblogIcon, dialog);
    await expect(dialog).toHaveAccessibleName('Reblog This Post');
    await expect(postPage.reblogDialogOkBtn).toBeEnabled();
    await expectFocusTrappedIn(page, dialog);
    // Moving focus and the pointer inside the dialog must not open the icon's tooltip above it
    await dialog.hover();
    await expect(postPage.footerReblogTooltip).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    await clickOutside(page);
    await expect(dialog).toBeVisible();
    await postPage.reblogDialogCancelBtn.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await postPage.footerReblogIcon.click();
    await expect(dialog).toBeVisible();
    await postPage.reblogDialogCloseBtn.click();
    await expect(dialog).toBeHidden();

    expect(broadcast.calls).toEqual([]);
  });

  test('UI-DIALOG-02 — the share dialog traps focus and closes on Esc, on a click outside and on its close button', async ({
    page
  }) => {
    await gotoPostLoggedIn(page);
    const trigger = page.getByTestId('share-post');
    const dialog = page.getByTestId('share-post-dialog');

    await clickUntilOpen(trigger, dialog);
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expectFocusTrappedIn(page, dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await clickOutside(page);
    await expect(dialog).toBeHidden();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('close-dialog').click();
    await expect(dialog).toBeHidden();
  });
});
