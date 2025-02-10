import { chromium, expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { LoginForm } from '../../support/pages/loginForm';
import { users, urls } from '../../support/loginHelper';

test.describe('Login tests', () => {
  let homePage: HomePage;
  let loginForm: LoginForm;

  test.beforeEach(async ({ page, browserName }) => {

    homePage = new HomePage(page);
    loginForm = new LoginForm(page);
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
  });

  test('Login tests - correct credentials', async ({request }) => {

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(urls.staging.url);
    await page.waitForTimeout(10000)
    // await expect(homePage.loginBtn).toBeVisible()
    await homePage.loginBtn.click()
    await expect(loginForm.usernameInput).toBeVisible()
    await loginForm.usernameInput.fill(users.guest4test2.username)
    await loginForm.passwordInput.fill('testtest')
    await loginForm.wifInput.fill(users.guest4test2.keys.private_posting)
    await page.waitForTimeout(2000)
    await loginForm.saveSignInButton.click()
    await expect(homePage.profileAvatarButton).toBeVisible()

    await context.storageState({ path: 'session.json' });
  });

  test('Login tests - incorrect wif', async ({page, request }) => {

    await page.goto(urls.staging.url);
    await page.waitForTimeout(5000)
    await expect(homePage.loginBtn).toBeVisible()
    await homePage.loginBtn.click()
    await expect(loginForm.usernameInput).toBeVisible()
    await loginForm.usernameInput.fill(users.guest4test2.username)
    await loginForm.passwordInput.fill('testtest')
    await loginForm.wifInput.fill('5JRkNjKcsRwDfbrvUt9MVbkZmFS8VJ4SqxL79hya4vnF2JiMo2I')
    await expect(homePage.profileAvatarButton).not.toBeVisible()
    await expect(loginForm.wifInputErrorMessage).toBeVisible()
    await expect(loginForm.wifInputErrorMessage).toContainText('Invalid WIF checksum.')
  });
});