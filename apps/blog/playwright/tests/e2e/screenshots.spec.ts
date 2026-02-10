import { test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { CommunitiesPage } from '../support/pages/communitiesPage';

test.describe('Screenshot tests', () => {
  let homePage: HomePage;
  let loginForm: LoginForm;
  let communitiesPage: CommunitiesPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginForm = new LoginForm(page);
    communitiesPage = new CommunitiesPage(page);
  });

  test('Homepage screenshot', async ({ page }) => {
    await homePage.goto();
    await homePage.mainPostsTimelineVisible(20);
    await page.screenshot({ path: 'playwright/current-screenshots/homepage.png', fullPage: true });
  });

  test('Login dialog screenshot', async ({ page }) => {
    await homePage.goto();
    await homePage.loginBtn.click();
    await loginForm.validateDefaultLoginFormIsLoaded();
    await page.screenshot({ path: 'playwright/current-screenshots/login-dialog.png' });
  });

  test('Worldmappin community page screenshot', async ({ page }) => {
    await homePage.goto();
    await homePage.moveToWorldmappinCommunities();
    await communitiesPage.validataCommunitiesPageIsLoaded('Worldmappin');
    await page.screenshot({ path: 'playwright/current-screenshots/community-worldmappin.png', fullPage: true });
  });
});
