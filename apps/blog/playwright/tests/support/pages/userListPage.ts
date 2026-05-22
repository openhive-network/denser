import { Locator, Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../constants';

/**
 * POM for `/@{owner}/lists/{slug}` — `features/account-lists/list-area.tsx`.
 *
 * Renders four variants behind one `<ListArea>` component (muted /
 * blacklisted / followed_blacklists / followed_muted_lists). The
 * owner-only sections (Add account / Reset options) only mount when
 * `user.username === username && user.isLoggedIn`.
 */
export class UserListPage {
  readonly page: Page;
  readonly area: Locator;
  readonly title: Locator;
  readonly container: Locator;
  readonly emptyState: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly addAccountHeading: Locator;
  readonly addAccountInput: Locator;
  readonly addAccountSubmit: Locator;
  readonly resetAllButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.area = page.getByTestId('user-list-area');
    this.title = this.area.getByTestId('user-list-title');
    this.container = this.area.getByTestId('user-list-container');
    this.emptyState = this.container.getByTestId('user-list-empty');
    this.items = this.container.getByTestId('user-list-item');
    this.itemNames = this.items.getByTestId('user-list-item-name');
    this.addAccountHeading = page.getByRole('heading', { name: /add account to list/i });
    // Placeholder is hardcoded "username" in list-area.tsx:179 — not a
    // translation key, so this stays stable across locales.
    this.addAccountInput = this.area.locator('input[placeholder="username"]');
    // The submit button only mounts when `addValue || isLoading` — see
    // list-area.tsx:191. Locator handle is fine to create up-front;
    // Playwright auto-waits for it to appear after the input is filled.
    this.addAccountSubmit = this.area.getByRole('button', { name: /^add to list$/i });
    this.resetAllButton = page.getByRole('button', { name: /reset all lists/i });
  }

  async gotoListPage(username: string, slug: string): Promise<void> {
    await this.page.goto(`/@${username}/lists/${slug}`, { waitUntil: 'commit' });
  }

  async expectAreaVisible(): Promise<void> {
    await expect(this.area).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  }

  async expectTitleMatches(pattern: RegExp): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.title).toHaveText(pattern);
  }

  async expectContainerOrEmpty(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.items.or(this.emptyState)).toBeVisible();
  }

  async expectItemCount(count: number): Promise<void> {
    await expect(this.items).toHaveCount(count);
    await expect(this.itemNames).toHaveCount(count);
  }

  async expectOwnerOnlySectionsHidden(): Promise<void> {
    await expect(this.addAccountHeading).toHaveCount(0);
    await expect(this.resetAllButton).toHaveCount(0);
  }

  /**
   * The `<li>` for a given account. Matches by exact name text inside
   * `user-list-item-name` so that "ned" doesn't accidentally pick up a
   * row called "neddy".
   */
  itemRow(name: string): Locator {
    return this.items.filter({
      has: this.page
        .getByTestId('user-list-item-name')
        .filter({ hasText: new RegExp(`^${name}$`) })
    });
  }

  /**
   * The per-row remove button (Unmute / Unblacklist / Unfollow Blacklist /
   * Unfollow Muted List) — the single `<Button>` rendered inside the row
   * when `accountOwner` is true (list-item.tsx:98-112).
   */
  removeButton(name: string): Locator {
    return this.itemRow(name).getByRole('button');
  }

  /**
   * Per-variant "Reset <list>" button (list-area.tsx:231-244 — the
   * first button in the "Reset options" section). The all-lists reset
   * (`resetAllButton`) is the second button there and stays separate.
   */
  resetButton(
    variant: 'muted' | 'blacklisted' | 'followed_blacklists' | 'followed_muted_lists'
  ): Locator {
    const labels: Record<typeof variant, RegExp> = {
      // "Reset Muted Lists" (plural in the en locale).
      muted: /^reset muted lists?$/i,
      // Anchored at end-of-string so "Reset Followed Blacklists" doesn't
      // also match this regex.
      blacklisted: /^reset blacklist$/i,
      followed_blacklists: /^reset followed blacklists?$/i,
      followed_muted_lists: /^reset followed muted lists?$/i
    };
    return this.area.getByRole('button', { name: labels[variant] });
  }

  /**
   * Type a name into the Add input and submit it. Waits for the input
   * to clear (it does so synchronously inside `setAddValue('')` after
   * `handleAdd(addValue)` — list-area.tsx:186-187,196-198) so callers
   * can chain a follow-up `addAccount(...)` without racing the form.
   */
  async addAccount(name: string): Promise<void> {
    await this.addAccountInput.fill(name);
    await this.addAccountSubmit.click();
    await expect(this.addAccountInput).toHaveValue('');
  }
}
