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

  test('Select a key type in Unlock Key ', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();

    await hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger.click();
    await page.waitForTimeout(4000);
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyType.selectOption('posting');
    await page.waitForTimeout(4000);
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyType.selectOption('active');
    await page.waitForTimeout(4000);
    await hbauthLoginDialog.hbauthUnlockKeySelectKeyType.selectOption('watch');
    await page.waitForTimeout(4000);
  });


});
