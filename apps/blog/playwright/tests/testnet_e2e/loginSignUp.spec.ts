import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginHelper, users } from '../support/loginHelper';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';

test.describe('Login and Sign Up tests', () => {
  let homePage: HomePage;
  let loginHelper: LoginHelper;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginHelper = new LoginHelper(page);

    await homePage.goto();
  });

  test.use({ storageState: 'playwright/.auth/denserautotest0.json' });

  test('Sign In to the Denser App by denserautotest0 from storage', async ({page}) =>{
    // Validate User is logged in
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
  });

  test.describe('Specific login after reset storage', () => {
    // Reset storage
    test.use({ storageState: {cookies: [], origins: []}});
    // -- Happy path for Login
    // Use denserautotest1 user
    test('Sign In to the Denser App as denserautotest1', async ({page}) =>{
      await loginHelper.login(
        users.denserautotest1.username,
        users.denserautotest1.safeStoragePassword,
        users.denserautotest1.keys.private_posting
      );
    });

    // Use denserautotest2 user
    test('Sign In to the Denser App as denserautotest2', async ({page}) =>{
      await loginHelper.login(
        users.denserautotest2.username,
        users.denserautotest2.safeStoragePassword,
        users.denserautotest2.keys.private_posting
      );
    });
  });

  test('Sign In to the Denser App by denserautotest0 from storage again', async ({page}) =>{
    // Validate User is logged in
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
  });

  test.describe('Tests for denserautotest3 from storage', () => {
    // set denserautotest3 from storage
    test.use({ storageState: 'playwright/.auth/denserautotest3.json' });
    test('Sign In to the Denser App by denserautotest3 from storage', async ({page}) =>{
      // Validate User is logged in
      await loginHelper.validateLoggedInUser(users.denserautotest3.username);
    });
  });

  test.describe('Tests for denserautotest4 from storage', () => {
    // set denserautotest4 from storage
    test.use({ storageState: 'playwright/.auth/denserautotest4.json' });
    test('Sign In to the Denser App by denserautotest4 from storage', async ({page}) =>{
      // Validate User is logged in
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
    });
  });

  test('Sign In to the Denser App by denserautotest0 from storage again again', async ({page}) =>{
    // Validate User is logged in
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
  });
});
