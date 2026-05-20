import { Locator, Page, expect } from '@playwright/test';

export class AdvancedSettingsModal {
  readonly page: Page;
  readonly advancedSettingsTitleElement: Locator;
  readonly noLimitMaximumAcceptedPayoutButton: Locator;
  readonly declinePayoutMaximumAcceptedPayoutButton: Locator;
  readonly customValueMaximumAcceptedPayoutButton: Locator;
  readonly customValueMaximumAcceptedPayoutInput: Locator;
  readonly authorRewardsHeader: Locator;
  readonly authorRewardsType50Button: Locator;
  readonly authorRewardsType100Button: Locator;
  readonly authorRewardsTypeMessage: Locator;
  readonly addBeneficiarAccount: Locator;
  readonly addDefaultBeneficiarAccountValueInput: Locator;
  readonly addDefaultBeneficiarAccountNameInput: Locator;
  readonly addBeneficiarAccountValueInput: Locator;
  readonly addBeneficiarAccountNameInput: Locator;
  readonly deleteBeneficiarAccountButton: Locator;
  readonly beneficiariesMessageDialog: Locator;
  readonly postTemplatesBox: Locator;
  readonly listOfPostTemplates: Locator;
  readonly noTemplatesMessage: Locator;
  readonly nameOfNewPostTemplateInput: Locator;
  readonly templateNameTakenError: Locator;
  readonly postTemplateItem: Locator;
  readonly saveButton: Locator;
  readonly loadTemplateButton: Locator;
  readonly deleteTemplateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.advancedSettingsTitleElement = page.getByTestId('advanced-settings-title');
    this.noLimitMaximumAcceptedPayoutButton = page.getByTestId('maximum-accepted-payout-no_max');
    this.declinePayoutMaximumAcceptedPayoutButton = page.getByTestId('maximum-accepted-payout-0');
    this.customValueMaximumAcceptedPayoutButton = page.getByTestId('maximum-accepted-payout-custom');
    this.customValueMaximumAcceptedPayoutInput = page.getByTestId(
      'maximum-accepted-payout-custom-value-input'
    );
    this.authorRewardsHeader = page.getByText(/^Author rewards$/);
    this.authorRewardsType50Button = page.getByTestId('autor-rewards-50%');
    this.authorRewardsType100Button = page.getByTestId('autor-rewards-100%');
    this.authorRewardsTypeMessage = page.getByTestId('author-rewards-message');
    this.addBeneficiarAccount = page.getByTestId('add-beneficiar-account');
    this.addDefaultBeneficiarAccountValueInput = page.getByTestId('default-beneficiar-value');
    this.addDefaultBeneficiarAccountNameInput = page.getByTestId('default-beneficiar-name');
    this.addBeneficiarAccountValueInput = page.getByTestId('beneficiary-value');
    this.addBeneficiarAccountNameInput = page.getByTestId('beneficiary-name');
    this.deleteBeneficiarAccountButton = page.locator('button:text("Delete")');
    this.beneficiariesMessageDialog = page.getByTestId('beneficiaries-message-dialog');
    this.postTemplatesBox = page.getByTestId('post-templates-box');
    this.listOfPostTemplates = page.getByTestId('list-of-post-templates');
    this.noTemplatesMessage = page.getByTestId('no-templates-message');
    this.nameOfNewPostTemplateInput = page.getByTestId('name-of-a-new-template-input');
    this.templateNameTakenError = page.getByTestId('template-name-taken-error');
    this.postTemplateItem = this.listOfPostTemplates.getByTestId('template-list-item');
    this.saveButton = page.getByTestId('advanced-settings-save-button');
    this.loadTemplateButton = page.getByTestId('advanced-settings-load-template-button');
    this.deleteTemplateButton = page.getByTestId('advanced-settings-delete-template-button');
  }

  async validateAdvancedSettingsModalIsLoaded() {
    await expect(this.advancedSettingsTitleElement).toHaveText('Advanced settings');
    await expect(this.noLimitMaximumAcceptedPayoutButton).toBeVisible();
    await expect(this.declinePayoutMaximumAcceptedPayoutButton).toBeVisible();
    await expect(this.authorRewardsHeader).toBeVisible();
    await expect(this.authorRewardsType50Button).toBeVisible();
    await expect(this.authorRewardsType100Button).toBeVisible();
    await expect(this.postTemplatesBox).toBeVisible();
  }

  // Template names can collide as substrings (e.g. "Draft" and "Draft v2"),
  // so we match on the data-template-name attribute rather than text.
  templateItem(templateName: string): Locator {
    return this.listOfPostTemplates.locator(
      `[data-testid="template-list-item"][data-template-name="${templateName}"]`
    );
  }

  async clickSpecificTemplate(templateName: string) {
    await this.templateItem(templateName).click();
  }

  async fillTemplateName(templateName: string) {
    await this.nameOfNewPostTemplateInput.fill(templateName);
  }

  async saveSettings() {
    await this.saveButton.click();
  }

  // Save the current form state as a *new* template. The dialog also closes
  // and the modal re-opens with a cleared name input — callers that need to
  // assert on the new entry must re-open the modal first.
  async saveAsNewTemplate(templateName: string) {
    await this.fillTemplateName(templateName);
    await this.saveSettings();
  }

  async loadSelectedTemplate() {
    await this.loadTemplateButton.click();
  }

  async deleteSelectedTemplate() {
    await this.deleteTemplateButton.click();
  }

  async expectTemplateInList(templateName: string) {
    await expect(this.templateItem(templateName)).toBeVisible();
  }

  async expectTemplateNotInList(templateName: string) {
    await expect(this.templateItem(templateName)).toHaveCount(0);
  }

  async expectNoTemplatesMessage() {
    await expect(this.noTemplatesMessage).toBeVisible();
  }

  async expectTemplateNameTakenError() {
    await expect(this.templateNameTakenError).toBeVisible();
  }

  async expectLoadButtonVisible() {
    await expect(this.loadTemplateButton).toBeVisible();
  }

  async expectDeleteButtonVisible() {
    await expect(this.deleteTemplateButton).toBeVisible();
  }

  // Save button is disabled while a duplicate name is in the input. Useful
  // to assert from the negative path of TPL-01.
  async expectSaveDisabled() {
    await expect(this.saveButton).toBeDisabled();
  }

  // The Checkbox primitives carry className="hidden" (display:none), so
  // they're not interactive. Their <Label htmlFor> siblings are the
  // visible click surface — HTML5 synthesizes a click on the labeled
  // control when the user clicks the label, which fires Radix's
  // onCheckedChange. These helpers expose that surface so callers don't
  // reach for raw page.locator('label[for="..."]').
  maxPayoutOptionLabel(value: 'no_max' | '0' | 'custom'): Locator {
    return this.page.locator(`label[for="${value}"]`);
  }

  payoutTypeOptionLabel(value: '50%' | '100%'): Locator {
    return this.page.locator(`label[for="${value}"]`);
  }

  /**
   * "Default: <label>" text under the Author Rewards section. The label is
   * sourced from `authorRewardsText(preferences.blog_rewards)`, so it
   * tracks the user-preferences-{username} blog_rewards value.
   */
  defaultPayoutText(label: 'Decline Payout' | 'Power Up 100%' | '50% HBD / 50% HP'): Locator {
    return this.page.getByText(new RegExp(`Default:.*${label}`));
  }
}
