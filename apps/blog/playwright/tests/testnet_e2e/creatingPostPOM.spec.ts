import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';

test.describe.serial('Creating post tests with POM and fixture users', () => {

  test('Validate creating the new post by clicking the nav pencil icon for denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const postTitle: string = `Testing post POM - ${users.denserautotest4.username}`;
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

  test('Validate creating the new post by clicking the nav pencil icon for denserautotest0', async ({
    denserAutoTest0Page
  }) => {
    const postTitle: string = `Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = 'Content of the testing post POM';
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page.getByTestId('community-name').locator('..').locator('..').click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle,postContentText,postSummary,postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword)
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest0.username, postTitle, postSummary);
  });

  test('Validate creating the two posts one by one by clicking the nav pencil icon for denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const postTitle1: string = `1 Testing post POM - ${users.denserautotest4.username}`;
    const postContentText1: string = '1 Content of the testing post POM';
    const postSummary1: string = '1 My testing post POM';
    const postTag: string = 'test';

    const postTitle2: string = `2 Testing post POM - ${users.denserautotest4.username}`;
    const postContentText2: string = '2 Content of the testing post POM';
    const postSummary2: string = '2 My testing post POM';

    const homePage = new HomePage(denserAutoTest4Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
    const loginHelper = new LoginHelper(denserAutoTest4Page.page);
    const loginForm = new LoginForm(denserAutoTest4Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest4Page.page);

    // Create first post
    await homePage.goto();
    // Validate User is logged in as denserautotest4
    await loginHelper.validateLoggedInUser(users.denserautotest4.username);
    // Click to close the profile menu
    await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle1,postContentText1,postSummary1,postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword)
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest4.username, postTitle1, postSummary1);

    // Create second post
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle2,postContentText2,postSummary2,postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword)
    // Validate that user has been moved to the unmoderated tag page
    await loginForm.page.waitForTimeout(20000);
    await unmoderatedTagPage.page.reload({waitUntil:'load'});
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest4.username, postTitle2, postSummary2);
  });
});
