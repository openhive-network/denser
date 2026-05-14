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
  readonly nameOfNewPostTemplateInput: Locator;
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
    this.nameOfNewPostTemplateInput = page.getByTestId('name-of-a-new-template-input');
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

  async clickSpecificTemplate(templateName: string) {
    const template = this.postTemplateItem.getByText(templateName);
    await template.click();
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
}
