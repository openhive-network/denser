import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { gotoPostLoggedIn } from '../support/reblogShareContext';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import {
  clickOutside,
  clickUntilOpen,
  collectConsoleProblems,
  pressUntilOpen,
  runZeroDelayTimersLate
} from '../support/uiPrimitives';

/**
 * The header's account menu (`@hive/ui` DropdownMenu) behind the avatar, whose button is also the
 * trigger of the Resource Credits tooltip, driven with keyboard and mouse by a logged-in user. The
 * avatar has to be one focusable menu button: Enter and Space open the menu with focus on its first
 * item, the tooltip stays closed while the menu is open so a single Esc closes the menu, and focus
 * returns to the avatar however the menu closes.
 *
 * Fixtures: reuses `reblogShare` (read-only on replay); the header is the same on every page.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- uiPrimitivesUserMenu
 */

test.use({ fixtureTestName: 'reblogShare', authenticatedUser: {} });
test.skip(isRecordMode, 'replay-only: shares the reblogShare recording');

test.describe('Radix primitives — header account menu, logged in', () => {
  let consoleProblems: string[];

  test.beforeEach(async ({ page }) => {
    consoleProblems = collectConsoleProblems(page);
    await gotoPostLoggedIn(page);
  });

  test.afterEach(() => {
    expect(consoleProblems, consoleProblems.join('\n')).toEqual([]);
  });

  test('UI-MENU-USER-01 — the avatar is a menu button that Enter and Space open, a single Esc closes, and focus returns to it', async ({
    page
  }) => {
    const trigger = new HomePage(page).profileAvatarButton;
    const menu = new ProfileUserMenu(page).profileMenuContent;
    const firstItem = menu.getByRole('menuitem').first();

    await expect(trigger).toHaveAccessibleName(`${DEFAULT_USER.username} account menu, posting key`);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await pressUntilOpen(trigger, 'Enter', menu);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(firstItem).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.press(' ');
    await expect(menu).toBeVisible();
    await expect(firstItem).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('UI-MENU-USER-02 — opened with the mouse, the menu hides the tooltip, closes on one Esc or a click outside, and returns focus', async ({
    page
  }) => {
    const trigger = new HomePage(page).profileAvatarButton;
    const menu = new ProfileUserMenu(page).profileMenuContent;

    await clickUntilOpen(trigger, menu);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(menu).toBeVisible();
    await clickOutside(page);

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('UI-MENU-USER-03 — a click outside closes the menu even when it lands before Radix arms its own outside-press listener', async ({
    page
  }) => {
    const trigger = new HomePage(page).profileAvatarButton;
    const menu = new ProfileUserMenu(page).profileMenuContent;

    await clickUntilOpen(trigger, menu);
    await clickOutside(page);
    await expect(menu).toBeHidden();

    await runZeroDelayTimersLate(page);
    await trigger.click();
    await expect(menu).toBeVisible();
    await clickOutside(page);

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
