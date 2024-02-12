import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { HbauthLoginDialog } from '../support/pages/hbauthLoginDialog';

test.describe('Login and Sign Up tests', () => {
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

  test('Validate base style of Hbauth in Unlock Key in the light mode', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();

    // Validate background color of login dialog
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.loginDialogHbauth,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Validate color and background color of the unlock key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'color'
      )
    ).toBe('rgb(15, 23, 42)');
    // Validate color of the header
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyHeader,
        'color'
      )
    ).toBe('rgb(31, 41, 55)');
    // Validate color, background color and border of the unlock key username input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyUsernameInput,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyUsernameInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyUsernameInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color, background color and border of the unlock key password input
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(
    //     await hbauthLoginDialog.hbauthUnlockKeyPasswordInput,
    //     'background-color'
    //   )
    // ).toBe('rgb(255, 255, 255)');
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(
    //     await hbauthLoginDialog.hbauthUnlockKeyPasswordInput,
    //     'color'
    //   )
    // ).toBe('rgb(17, 24, 39)');
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(
    //     await hbauthLoginDialog.hbauthUnlockKeyPasswordInput,
    //     'border'
    //   )
    // ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color and border of the unlock key select list
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger,
        'color'
      )
    ).toBe('rgb(15, 23, 42)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger,
        'border'
      )
    ).toBe('1px solid rgb(226, 232, 240)');
    // Validate color, background color of the unlock key submit button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySubmitButton,
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySubmitButton,
        'color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Validate color, background color of the unlock key reset button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyResetButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyResetButton,
        'color'
      )
    ).toBe('rgb(107, 114, 128)');
    // Validate color, border color of the Add key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyButton,
        'border-bottom-color'
      )
    ).toBe('rgb(226, 232, 240)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyButton, 'color')
    ).toBe('rgb(100, 116, 139)');
  });

  test('Validate base style of Hbauth in Unlock Key in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();

    // Validate background color of login dialog
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.loginDialogHbauth,
        'background-color'
      )
    ).toBe('rgb(3, 7, 17)');
    // Validate color and background color of the unlock key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'background-color'
      )
    ).toBe('rgb(3, 7, 17)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    // Validate color of the header
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyHeader,
        'color'
      )
    ).toBe('rgb(31, 41, 55)');
    // Validate color, background color and border of the unlock key username input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyUsernameInput,
        'background-color'
      )
      //  webkit: 'rgb(30, 30, 30)'
      // firefox: 'rgb(43, 42, 51)'
      //  chrome: 'rgb(59, 59, 59)'
    ).toMatch(/rgb\(43, 42, 51\)|rgb\(59, 59, 59\)|rgb\(30, 30, 30\)/);
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyUsernameInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyUsernameInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // // Validate color, background color and border of the unlock key password input
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(
    //     await hbauthLoginDialog.hbauthUnlockKeyPasswordInput,
    //     'background-color'
    //   )
    //   //  webkit: 'rgb(30, 30, 30)'
    //   // firefox: 'rgb(43, 42, 51)'
    //   //  chrome: 'rgb(59, 59, 59)'
    //   ).toMatch(/rgb\(43, 42, 51\)|rgb\(59, 59, 59\)|rgb\(30, 30, 30\)/);
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(
    //     await hbauthLoginDialog.hbauthUnlockKeyPasswordInput,
    //     'color'
    //   )
    // ).toBe('rgb(17, 24, 39)');
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(
    //     await hbauthLoginDialog.hbauthUnlockKeyPasswordInput,
    //     'border'
    //   )
    // ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color and border of the unlock key select list
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger,
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySelectKeyTypeTrigger,
        'border'
      )
    ).toBe('1px solid rgb(29, 40, 58)');
    // Validate color, background color of the unlock key submit button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySubmitButton,
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeySubmitButton,
        'color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Validate color, background color of the unlock key reset button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyResetButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyResetButton,
        'color'
      )
    ).toBe('rgb(107, 114, 128)');
    // Validate color, border color of the Add key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyButton,
        'border-bottom-color'
      )
    ).toBe('rgb(29, 40, 58)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyButton, 'color')
    ).toBe('rgb(127, 142, 163)');
  });

  test('Validate base style of Hbauth in Add Key in the light mode', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    // Move to the Add Key Tab
    await hbauthLoginDialog.hbauthAddKeyButton.click();
    await hbauthLoginDialog.validateHbauthAddKeyDialogIsVisible();
    await hbauthLoginDialog.page.waitForTimeout(1000);
    // Validate background color of login dialog
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.loginDialogHbauth,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Validate color and background color of the add key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyButton,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyButton, 'color')
    ).toBe('rgb(15, 23, 42)');
    // Validate color of the header
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyHeader, 'color')
    ).toBe('rgb(31, 41, 55)');
    // Validate color, background color and border of the add key username input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyUsernameInput,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyUsernameInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyUsernameInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color, background color and border of the add key password input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPasswordInput,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPasswordInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPasswordInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color and border of the add key select list
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger,
        'color'
      )
    ).toBe('rgb(15, 23, 42)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger,
        'border'
      )
    ).toBe('1px solid rgb(226, 232, 240)');
    // Validate color, background color and border of the add key private key input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput,
        'background-color'
      )
    ).toBe('rgb(255, 255, 255)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color, background color of the add key submit button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySubmitButton,
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySubmitButton,
        'color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Validate color, background color of the add key reset button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyResetButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyResetButton,
        'color'
      )
    ).toBe('rgb(107, 114, 128)');
    // Validate color, border color of the Unlock key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'border-bottom-color'
      )
    ).toBe('rgb(226, 232, 240)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'color'
      )
    ).toBe('rgb(100, 116, 139)');
  });

  test('Validate base style of Hbauth in Add Key in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    // Open Hbauth login dialog
    await homePage.getNavHbauthLink.click();
    // Move to the Add Key Tab
    await hbauthLoginDialog.hbauthAddKeyButton.click();
    await hbauthLoginDialog.validateHbauthAddKeyDialogIsVisible();
    // Validate background color of login dialog
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.loginDialogHbauth,
        'background-color'
      )
    ).toBe('rgb(3, 7, 17)');
    // Validate color and background color of the add key button
    await hbauthLoginDialog.page.waitForTimeout(1000);
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyButton,
        'background-color'
      )
    ).toBe('rgb(3, 7, 17)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyButton, 'color')
    ).toBe('rgb(225, 231, 239)');
    // Validate color of the header
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyHeader, 'color')
    ).toBe('rgb(31, 41, 55)');
    // Validate color, background color and border of the add key username input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyUsernameInput,
        'background-color'
      )
      //  webkit: 'rgb(30, 30, 30)'
      // firefox: 'rgb(43, 42, 51)'
      //  chrome: 'rgb(59, 59, 59)'
    ).toMatch(/rgb\(43, 42, 51\)|rgb\(59, 59, 59\)|rgb\(30, 30, 30\)/);
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyUsernameInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyUsernameInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color, background color and border of the add key password input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPasswordInput,
        'background-color'
      )
      //  webkit: 'rgb(30, 30, 30)'
      // firefox: 'rgb(43, 42, 51)'
      //  chrome: 'rgb(59, 59, 59)'
    ).toMatch(/rgb\(43, 42, 51\)|rgb\(59, 59, 59\)|rgb\(30, 30, 30\)/);
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPasswordInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPasswordInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color and border of the add key select list
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger,
        'color'
      )
    ).toBe('rgb(225, 231, 239)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySelectKeyTypeTrigger,
        'border'
      )
    ).toBe('1px solid rgb(29, 40, 58)');
    // Validate color, background color and border of the add key private key input
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput,
        'background-color'
      )
      //  webkit: 'rgb(30, 30, 30)'
      // firefox: 'rgb(43, 42, 51)'
      //  chrome: 'rgb(59, 59, 59)'
    ).toMatch(/rgb\(43, 42, 51\)|rgb\(59, 59, 59\)|rgb\(30, 30, 30\)/);
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput,
        'color'
      )
    ).toBe('rgb(17, 24, 39)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput,
        'border'
      )
    ).toBe('1px solid rgb(209, 213, 219)');
    // Validate color, background color of the add key submit button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySubmitButton,
        'background-color'
      )
    ).toBe('rgb(220, 38, 38)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeySubmitButton,
        'color'
      )
    ).toBe('rgb(255, 255, 255)');
    // Validate color, background color of the add key reset button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyResetButton,
        'background-color'
      )
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthAddKeyResetButton,
        'color'
      )
    ).toBe('rgb(107, 114, 128)');
    // Validate color, border color of the Unlock key button
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'border-bottom-color'
      )
    ).toBe('rgb(29, 40, 58)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(
        await hbauthLoginDialog.hbauthUnlockKeyButton,
        'color'
      )
    ).toBe('rgb(127, 142, 163)');
  });

  test('Validate Hbauth login dialog styles after hovering and clicking', async ({ page }) => {
    await homePage.goto();
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();
    // Validate submit button after hovering
    await hbauthLoginDialog.hbauthUnlockKeySubmitButton.hover();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthUnlockKeySubmitButton, 'background-color')
    ).toBe('rgb(185, 28, 28)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthUnlockKeySubmitButton, 'color')
    ).toBe('rgb(255, 255, 255)');
    // Validate reset button after hovering
    await hbauthLoginDialog.hbauthUnlockKeyResetButton.hover();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthUnlockKeyResetButton, 'background-color')
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthUnlockKeyResetButton, 'color')
    ).toBe('rgb(220, 38, 38)');
    // Validate border color of username input after clicking inside
    await hbauthLoginDialog.hbauthUnlockKeyUsernameInput.click();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthUnlockKeyUsernameInput, 'border-bottom-color')
    ).toBe('rgb(239, 68, 68)');
    // // Validate border color of password input after clicking inside
    // await hbauthLoginDialog.hbauthUnlockKeyPasswordInput.click();
    // await expect(
    //   await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthUnlockKeyPasswordInput, 'border-bottom-color')
    // ).toBe('rgb(239, 68, 68)');
  });

  test('Validate Hbauth login dialog styles in Add Key Tab after hovering and clicking in the dark mode', async ({ page }) => {
    await homePage.goto();
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();
    // Open Hbauth dialog
    await homePage.getNavHbauthLink.click();
    await hbauthLoginDialog.validateHbauthUnlockKeyDialogIsVisible();
    // Move to the Hbauth Add Key Dialog
    await hbauthLoginDialog.hbauthAddKeyButton.click();
    await hbauthLoginDialog.validateHbauthAddKeyDialogIsVisible();
    // Validate submit button after hovering
    await hbauthLoginDialog.hbauthAddKeySubmitButton.hover();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeySubmitButton, 'background-color')
    ).toBe('rgb(185, 28, 28)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeySubmitButton, 'color')
    ).toBe('rgb(255, 255, 255)');
    // Validate reset button after hovering
    await hbauthLoginDialog.hbauthAddKeyResetButton.hover();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyResetButton, 'background-color')
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyResetButton, 'color')
    ).toBe('rgb(220, 38, 38)');
    // Validate border color of username input after clicking inside
    await hbauthLoginDialog.hbauthAddKeyUsernameInput.click();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyUsernameInput, 'border-bottom-color')
    ).toBe('rgb(239, 68, 68)');
    // Validate border color of password input after clicking inside
    await hbauthLoginDialog.hbauthAddKeyPasswordInput.click();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyPasswordInput, 'border-bottom-color')
    ).toBe('rgb(239, 68, 68)');
    // Validate border color of private key input after clicking inside
    await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput.click();
    await expect(
      await hbauthLoginDialog.getElementCssPropertyValue(await hbauthLoginDialog.hbauthAddKeyPrivateKeyInput, 'border-bottom-color')
    ).toBe('rgb(239, 68, 68)');
  });
});
