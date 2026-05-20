import { Locator, Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../constants';

/**
 * Page Object for `/@{username}/settings`.
 *
 * Backs the §8 spec (`loggedInUserSettings.spec.ts`). Splits the page in two:
 *   - Public profile settings — text inputs that, on save, trigger an
 *     `account_update2_operation` broadcast (TX-10).
 *   - Preferences — four Radix `<Select>` controls bound to a per-user
 *     localStorage entry (`user-preferences-{username}`), no broadcast.
 *
 * The Preferences selectors target the `data-testid` wrappers from
 * `features/account-settings/form.tsx:281-373`; the visible trigger is the
 * `combobox` descendant. `setPreferenceByLabel` opens a select and clicks
 * the option by visible text, since Radix Selects don't expose
 * individual option testids.
 */
export class SettingsPage {
  readonly page: Page;

  readonly publicProfileSettingsContainer: Locator;

  // Profile fields (SET-01..06)
  readonly profileImageInput: Locator;
  readonly coverImageInput: Locator;
  readonly nameInput: Locator;
  readonly aboutInput: Locator;
  readonly locationInput: Locator;
  readonly websiteInput: Locator;
  readonly blacklistDescriptionInput: Locator;
  readonly mutedListDescriptionInput: Locator;
  readonly updateButton: Locator;

  // Preferences (SET-07..13)
  readonly preferencesContainer: Locator;
  readonly nsfwSelectTrigger: Locator;
  readonly blogRewardsSelectTrigger: Locator;
  readonly commentRewardsSelectTrigger: Locator;
  readonly referralSelectTrigger: Locator;

  // Post-save toast (SET-01..04) — Radix renders the description into both
  // a visible <div> and an `aria-live` <span>, hence `exact: true`.
  readonly changesSavedToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.publicProfileSettingsContainer = page.getByTestId('public-profile-settings');

    this.profileImageInput = page.locator('#profileImage');
    this.coverImageInput = page.locator('#coverImage');
    this.nameInput = page.locator('#name');
    this.aboutInput = page.locator('#about');
    this.locationInput = page.locator('#location');
    this.websiteInput = page.locator('#website');
    this.blacklistDescriptionInput = page.locator('#blacklistDescription');
    this.mutedListDescriptionInput = page.locator('#mutedListDescription');
    this.updateButton = page.getByTestId('pps-update-button');

    this.preferencesContainer = page.getByTestId('settings-preferences');
    this.nsfwSelectTrigger = page
      .getByTestId('not-safe-for-work-content')
      .getByRole('combobox');
    this.blogRewardsSelectTrigger = page
      .getByTestId('blog-post-rewards')
      .getByRole('combobox');
    this.commentRewardsSelectTrigger = page
      .getByTestId('comment-post-rewards')
      .getByRole('combobox');
    this.referralSelectTrigger = page
      .getByTestId('referral-system')
      .getByRole('combobox');

    this.changesSavedToast = page.getByText('Changes saved', { exact: true });
  }

  async waitForReady(): Promise<void> {
    await expect(this.publicProfileSettingsContainer).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    // The form is rendered only when the observer is on their own profile
    // (content.tsx:12). Wait for the update button to mount so input fills
    // don't race the initial state hydration from `getAccountFull`.
    await expect(this.updateButton).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  }

  /**
   * Click a Radix Select trigger and pick the option whose visible text
   * matches `optionLabel`. Asserts the chosen value is reflected in the
   * trigger's accessible name afterwards.
   */
  async setPreferenceByLabel(trigger: Locator, optionLabel: string): Promise<void> {
    await trigger.click();
    await this.page.getByRole('option', { name: optionLabel }).click();
    await expect(trigger).toContainText(optionLabel);
  }
}
