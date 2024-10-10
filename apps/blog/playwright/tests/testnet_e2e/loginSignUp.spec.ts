import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginHelper, users } from '../support/loginHelper';

test.describe('Login and Sign Up tests', () =>{
  let homePage: HomePage;
  let loginHelper: LoginHelper;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginHelper = new LoginHelper(page);

    await homePage.goto();
  });

  // -- Happy path for Login
  // Use denserautotest1 user
  test('Sign In to the Denser App', async ({page}) =>{
    await loginHelper.login(
      users.denserautotest1.username,
      users.denserautotest1.safeStoragePassword,
      users.denserautotest1.keys.private_posting
    );
  });

  // Use denserautotest2 user
  test('Sign In to the Denser App by another user', async ({page}) =>{
    await loginHelper.login(
      users.denserautotest2.username,
      users.denserautotest2.safeStoragePassword,
      users.denserautotest2.keys.private_posting
    );
  });
});
