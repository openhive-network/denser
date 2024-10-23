import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';

test.describe('Creating post tests with POM and fixture users', () => {

  test('Validate creating the new post by clicking the nav pencil icon', async ({
    denserAutoTest4Page
  }) => {
    const postTitle: string = 'Testing post POM';
    const postContentText: string = 'Content of the testing post POM';
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest4Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
    const loginHelper = new LoginHelper(denserAutoTest4Page.page);
    const loginForm = new LoginForm(denserAutoTest4Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest4Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest4
    await loginHelper.validateLoggedInUser(users.denserautotest4.username);
    // Click to close the profile menu
    await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle,postContentText,postSummary,postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword)
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest4.username, postTitle, postSummary);
  });
});
