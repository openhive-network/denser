import { chromium, expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { PostPage } from '../../support/pages/postPage';
import { ProfilePage } from '../../support/pages/profilePage';
import { CommentViewPage } from '../../support/pages/commentViewPage';

test.describe('Login tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;
  let commentViewPage: CommentViewPage;

  test.beforeEach(async ({ page, browserName }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
    commentViewPage = new CommentViewPage(page);
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
  });

  test('Login tests - correct credentials', async ({request }) => {

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();


    await page.goto('https://blog.fake.openhive.network');
    await expect(page.getByTestId('login-btn')).toBeVisible()
    await page.getByTestId('login-btn').click()
    await expect(page.getByTestId('username-input')).toBeVisible()
    await page.getByTestId('username-input').fill("guest4test2")
    await page.getByTestId('password-input').fill('testtest')
    await page.getByTestId('wif-input').fill('5JRkNjKcsRwDfbrvUt9MVbkZmFS8VJ4SqxL79hya4vnF2JiMo2L')
    await page.locator('div').filter({ hasText: /^Save and sign in$/ }).click()
    await expect(page.getByTestId('profile-avatar-button')).toBeVisible()

    await context.storageState({ path: 'session.json' });

    // await page.getByTestId("nav-pencil").click()
    // await expect(page.getByTestId("post-title-input")).toBeVisible()
  });

  test('Login tests - incorrect credentials', async ({page, request }) => {

    await page.goto('https://blog.fake.openhive.network');
    await expect(page.getByTestId('login-btn')).toBeVisible()
    await page.getByTestId('login-btn').click()
    await expect(page.getByTestId('username-input')).toBeVisible()
    await page.getByTestId('username-input').fill("guest4test2")
    await page.getByTestId('password-input').fill('testtest')
    await page.getByTestId('wif-input').fill('5JRkNjKcsRwDfbrvUt9MVbkZmFS8VJ4SqxL79hya4vnF2JiMo2I')
    await page.locator('div').filter({ hasText: /^Save and sign in$/ }).click()
    await expect(page.getByTestId('profile-avatar-button')).not.toBeVisible()
  });

  
});