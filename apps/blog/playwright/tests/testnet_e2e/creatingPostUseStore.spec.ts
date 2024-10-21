import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { users } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';

test.describe('Creating post tests and use store', () =>{
  let homePage: HomePage;
  // set denserautotest4 from storage
  test.use({ storageState: 'playwright/.auth/denserautotest4.json' });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);

    await homePage.goto();
  });

  // User is logged in but there is the problem with creating a post
  test('Validate creating the new post by clicking the nav pencil icon', async ({page}) =>{
    const postTitle: string = 'Testing post';
    const postContentText: string = 'Content of the testing post';
    const postSummary: string = 'My testing post';
    const postTag: string = 'test';

    const loginFormDefaut = new LoginForm(page);
    const profileMenu = new ProfileUserMenu(page);
    const postEditorPage = new PostEditorPage(page);

    // await homePage.loginBtn.click()
    // await loginFormDefaut.validateDefaultLoginFormIsLoaded();
    // // Sign In
    // await loginFormDefaut.usernameInput.fill(users.denserautotest4.username);
    // await loginFormDefaut.passwordInput.fill(users.denserautotest4.safeStoragePassword);
    // await loginFormDefaut.wifInput.fill(users.denserautotest4.keys.private_posting); // Posting Key
    // await loginFormDefaut.saveSignInButton.click();
    await homePage.profileAvatarButton.click();
    // Validate User is logged in
    await page.waitForSelector(profileMenu.profileMenuContent['_selector']);
    await profileMenu.validateUserProfileManuIsOpen();
    await profileMenu.validateUserNameInProfileMenu(users.denserautotest4.username);
    // Click to close the profile menu
    await page.getByTestId('community-name').locator('..').locator('..').click({force: true});
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // await page.waitForTimeout(5000);
    // Type the title of the post
    await postEditorPage.getPostTitleInput.fill(postTitle);
    // Type the conntent of the post
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    // Type the post summary
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    // Type the tag
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    // Click the submit button
    await postEditorPage.getSubmitPostButton.click();
    // Wait for optimistic ui will finished and validate that you are moved to the unmoderated tag page
    expect(await page.locator('[data-testid="community-name-unmoderated"]').textContent()).toBe(
      'Unmoderated tag'
    );
    expect(await page.locator('[data-testid="community-name"]').textContent()).toBe(
      `#${postTag}`
    );
    // Validate the first post on the unmoderated post list
    // Validate post's author name
    expect(await page.locator('[data-testid="post-list-item"]').first().locator('[data-testid="post-author"]').textContent()).toBe(users.denserautotest4.username);
    // Validate the first post's title
    expect(await page.locator('[data-testid="post-list-item"]').first().locator('[data-testid="post-title"]').textContent()).toBe(postTitle);
    // Validate the first post's summary description
    expect(await page.locator('[data-testid="post-list-item"]').first().locator('[data-testid="post-description"]').textContent()).toBe(postSummary);
  });
});
