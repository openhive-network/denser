import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { clickUntilOpen } from '../support/uiPrimitives';

/**
 * Accessible names and ARIA semantics of the logged-out header and the menu panel: every icon-only
 * control is named, the search-mode options and the search input carry the current mode, and the
 * menu panel is a named modal dialog whose unavailable item is exposed as disabled with a reason.
 *
 * Fixtures: reuses `homeMainPage` (read-only on replay), as uiPrimitivesAnonymous.spec.ts does.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- headerAccessibleNames
 */

test.use({ fixtureTestName: 'homeMainPage' });
test.skip(isRecordMode, 'replay-only: shares the homeMainPage recording');

test.describe('Header and menu panel — accessible names, logged out', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trending');
    await expect(new HomePage(page).getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  test('A11Y-HEADER-01 — icon-only header controls have accessible names', async ({ page }) => {
    const homePage = new HomePage(page);

    await expect(homePage.getNavCreatePost).toHaveAccessibleName('Create Post');
    await expect(homePage.getNavSidebarMenu).toHaveAccessibleName('Menu Panel');
    await expect(homePage.getThemeModeButton).toHaveAccessibleName('Theme');
  });

  test('A11Y-HEADER-02 — the search-mode options are named and the trigger and input follow the selection', async ({
    page
  }) => {
    const trigger = page.getByRole('combobox', { name: /^Search mode: / });
    const list = page.getByRole('listbox');

    await clickUntilOpen(trigger, list);
    const options = list.getByRole('option');
    await expect(options).toHaveCount(5);
    for (const [index, name] of ['Posts', 'AI search', 'Users', 'User posts by topic', 'Tags'].entries()) {
      await expect(options.nth(index)).toHaveAccessibleName(name);
    }

    await list.getByRole('option', { name: 'Users' }).click();

    await expect(list).toBeHidden();
    await expect(trigger).toHaveAccessibleName('Search mode: Users');
    await expect(page.getByRole('textbox', { name: 'Search users' })).toBeVisible();
  });

  test('A11Y-HEADER-03 — the menu panel is a named modal dialog with the unavailable item marked disabled', async ({
    page
  }) => {
    const homePage = new HomePage(page);
    const dialog = page.getByRole('dialog', { name: 'Menu Panel' });

    await clickUntilOpen(homePage.getNavSidebarMenu, dialog);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    const recovery = dialog.getByRole('link', { name: 'Stolen Account Recovery' });
    await expect(recovery).toHaveAttribute('aria-disabled', 'true');
    await expect(recovery).toHaveAccessibleDescription('Not available yet');
    await recovery.focus();
    await expect(recovery).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
