import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { HbauthLoginDialog } from '../support/pages/hbauthLoginDialog';

test.describe('Login and Sign Up tests', () =>{
  let homePage: HomePage;
  let hbauthLoginDialog: HbauthLoginDialog;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    hbauthLoginDialog = new HbauthLoginDialog(page);

  });

  test('Validate Hbauth login dialog is visible', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();
  });

  test('Select a key type in Unlock Key', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();

    await expect(hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger).toHaveText('Select a key type');
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger.click();
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyType.selectOption('posting');
    await expect(hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger).toHaveText('Posting');
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyType.selectOption('active');
    await expect(hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger).toHaveText('Active');
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyType.selectOption('watch');
    await expect(hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger).toHaveText('Watch Mode');
  });

  test('Validate Hbauth Add Key login dialog is visible', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();
    // Move to the Add Key Tab
    await hbauthLoginDialog.hbauthAddKeyButton.click();
    await hbauthLoginDialog.validateHbauthAddKeyDialogIsVisible();
  });

  test('Select a key type in Add Key', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    // Move to the Add Key Tab
    await hbauthLoginDialog.hbauthAddKeyButton.click();
    await hbauthLoginDialog.validateHbauthAddKeyDialogIsVisible();
    // Validate select list
    await expect(hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger).toHaveText('Select a key type');
    await hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger.click();
    await hbauthLoginDialog.hbauthAddKeySelectKeyType.selectOption('posting');
    await expect(hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger).toHaveText('Posting');
    await hbauthLoginDialog.hbauthAddKeySelectKeyType.selectOption('active');
    await expect(hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger).toHaveText('Active');
  });

});
