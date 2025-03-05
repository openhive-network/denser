import { expect, test } from '@playwright/test';
import { chromium, BrowserContext } from 'playwright';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import path from 'path';
import { promises as fs } from 'fs';
import { LoginHelper } from '../support/loginHelper';

const EXTENSION_PATH = process.env.EXTENSION_PATH;
const USER_DATA_FOLDER = process.env.USER_DATA_FOLDER;
const KEYCHAIN_EXTENSION_PAGE = process.env.KEYCHAIN_EXTENSION_PAGE;
const USER_KEY = process.env.USER_KEY;
const KEYCHAIN_PASSWORD = process.env.KEYCHAIN_PASSWORD;
const HIVE_USER_NAME = process.env.HIVE_USER_NAME;

async function removeFolder(folderPath) {
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`The folder ${folderPath} has been deleted.`);
  } catch (error) {
    console.error(`Error when deleting a folder ${folderPath}: ${error}`);
  }
}

// These tests work only local
test.describe.skip('Test Keychain Extension', () => {
  let context: BrowserContext;

  test.beforeAll('Setup Keychain', async ({}) => {
    // Delete user-date dictionary
    const folderToRemove = path.join(__dirname, `../../../${USER_DATA_FOLDER}`);
    console.log('Folder user-data to remove: ', folderToRemove);
    await removeFolder(folderToRemove);

    // Create the new context with keychain extension
    context = await chromium.launchPersistentContext(
      `${USER_DATA_FOLDER}`, // Directory for storing user data
      {
        headless: false, // Must be `false`, because extensions do not work in headless
        args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`]
      }
    );

    // Open Keychain in the new page
    const page = await context.newPage();
    await page.goto(`${KEYCHAIN_EXTENSION_PAGE}`);
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input-confirmation"]')).toBeVisible();
    // Create your password to keychain
    await page.locator('[data-testid="password-input"]').fill(`${KEYCHAIN_PASSWORD}`);
    await page.locator('[data-testid="password-input-confirmation"]').fill(`${KEYCHAIN_PASSWORD}`);
    // Check connditions
    await page.locator('#accept-terms-and-condition-inner-input .custom-checkbox').click();
    // Click signup button
    await page.locator('[data-testid="signup-button"]').click();
    // Click Use keys/pwd button
    await page.locator('[data-testid="add-by-keys-button"]').click();
    // Validate and enter your hive account name and posting posting key
    await expect(page.locator('.title')).toHaveText('Setup');
    await page.locator('[data-testid="input-username"]').fill(`${HIVE_USER_NAME}`);
    await page.locator('[data-testid="input-private-key"]').fill(`${USER_KEY}`);
    await page.locator('[data-testid="submit-button"]').click();
    // Welcome to Keychain! - modal
    await expect(page.locator('.popup-title')).toHaveText('Welcome to Keychain!');
    // Click Skip Button
    await page.locator('.popup-footer .alternative').click();
  });

  test('Validate login by keychain', async ({}) => {
    const page = await context.newPage();
    const homePage = new HomePage(page);
    const loginForm = new LoginForm(page);

    // Move to the blog home page
    await homePage.goto();
    await homePage.loginBtn.click();
    await loginForm.validateDefaultLoginFormIsLoaded();
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.validateDefaultOtherSignInOptionsFormIsLoaded();
    await loginForm.otherSignInOptionsUsernameInput.fill(`${HIVE_USER_NAME}`);
    // Password for your user keychain
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      loginForm.hiveKeychainExtensionButton.click() // click keychain to login
    ]);
    // Validate Sign Transaction Page
    await expect(newPage.locator('.title')).toHaveText('Sign Transaction');
    await expect(newPage.locator('.operation-body .value').first()).toContainText(`${HIVE_USER_NAME}`);
    await expect(newPage.locator('.operation-body .value').nth(1)).toContainText('Posting');
    // Click Confirm Button
    await newPage.locator('.operation-buttons .important').click();
    // Wait and Validate that your user is login in blog page
    const loginHelper = new LoginHelper(page);
    await loginHelper.validateLoggedInUser(`${HIVE_USER_NAME}`);
    await page.waitForTimeout(3000);
  });
});
