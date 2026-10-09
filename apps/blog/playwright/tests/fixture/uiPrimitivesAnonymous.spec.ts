import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { THEME_COLORS, TIMEOUTS } from '../support/constants';
import {
  clickOutside,
  clickUntilOpen,
  collectConsoleProblems,
  expectFocusTrappedIn,
  pressUntilOpen
} from '../support/uiPrimitives';

/**
 * The `@hive/ui` Radix primitives a logged-out visitor uses on the feed, driven with mouse and
 * keyboard: the feed sort Select (Radix Select 2), the theme toggle's DropdownMenu (Radix
 * DropdownMenu 2.1 + next-themes 0.4) and the login Dialog. Each test opens and closes the
 * primitive both ways, checks where focus goes, that the chosen value is applied, and that the
 * page logs no console error or warning on the way.
 *
 * Fixtures: reuses `homeMainPage` (recorded with JS on, holds /trending and /hot; read-only on
 * replay), as feedNavigation.spec.ts does.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- uiPrimitivesAnonymous
 */

test.use({ fixtureTestName: 'homeMainPage' });
test.skip(isRecordMode, 'replay-only: shares the homeMainPage recording');

test.describe('Radix primitives — logged out, on the feed', () => {
  let consoleProblems: string[];

  test.beforeEach(async ({ page }) => {
    consoleProblems = collectConsoleProblems(page);
    await page.goto('/trending');
    await expect(new HomePage(page).getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  test.afterEach(() => {
    expect(consoleProblems, consoleProblems.join('\n')).toEqual([]);
  });

  test('UI-SELECT-01 — the feed sort opens, moves and applies with the keyboard; Esc keeps the value', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const trigger = homePage.getFilterPosts;
    const list = homePage.getFilterPostsList;

    await pressUntilOpen(trigger, 'Enter', list);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option', { name: 'Trending' })).toBeFocused();
    await expect(page.getByRole('option', { name: 'Trending' })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Hot' })).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(list).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Trending');
    await expect(page).toHaveURL(/\/trending$/);

    await trigger.press('ArrowDown');
    await expect(list).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Hot' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(list).toBeHidden();
    await expect(page).toHaveURL(/\/hot$/);
    await expect(trigger).toHaveText('Hot');
  });

  test('UI-SELECT-02 — the feed sort opens with the mouse and a click outside closes it unchanged', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const trigger = homePage.getFilterPosts;
    const list = homePage.getFilterPostsList;

    await clickUntilOpen(trigger, list);
    await expect(page.getByRole('option')).toHaveText(['Trending', 'Hot', 'New', 'Payouts', 'Muted']);

    await clickOutside(page);

    await expect(list).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveText('Trending');
    await expect(page).toHaveURL(/\/trending$/);

    await clickUntilOpen(trigger, list);
    await page.getByRole('option', { name: 'Hot' }).click();

    await expect(list).toBeHidden();
    await expect(page).toHaveURL(/\/hot$/);
    await expect(trigger).toHaveText('Hot');
  });

  test('UI-MENU-01 — the theme menu opens and picks Dark with the keyboard, Esc closes it and returns focus', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const trigger = homePage.getThemeModeButton;
    const menu = page.getByRole('menu');

    await pressUntilOpen(trigger, 'Enter', menu);
    await expect(page.getByRole('menuitem', { name: 'Light' })).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Dark' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await expect(homePage.getBody).toHaveCSS('background-color', THEME_COLORS.dark.bodyBackground);

    // next-themes keeps the choice: a reload renders dark again
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('UI-MENU-02 — the theme menu opens with the mouse, a click outside closes it, and Light applies', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const trigger = homePage.getThemeModeButton;
    const menu = page.getByRole('menu');

    await clickUntilOpen(trigger, menu);
    await expect(page.getByRole('menuitem')).toHaveText(['Light', 'Dark', 'System']);
    await clickOutside(page);
    await expect(menu).toBeHidden();

    await trigger.click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await trigger.click();
    await page.getByRole('menuitem', { name: 'Light' }).click();

    await expect(menu).toBeHidden();
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await expect(homePage.getBody).toHaveCSS('background-color', THEME_COLORS.light.bodyBackground);
  });

  test('UI-DIALOG-01 — the login dialog closes on Esc and on its close button, traps focus, and returns focus', async ({
    page
  }) => {
    const trigger = new HomePage(page).loginBtn;
    const dialog = page.getByRole('dialog');

    await clickUntilOpen(trigger, dialog);
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    // The trap check ends on a sign-in form button whose tooltip opens on focus; Esc would close
    // that topmost layer first, so this round closes with the close button.
    await trigger.press('Enter');
    await expect(dialog).toBeVisible();
    await expectFocusTrappedIn(page, dialog);
    await dialog.getByTestId('close-dialog').click();

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
