import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { PostPage } from '../support/pages/postPage';
import { waitForPostIsVisibleInUnmoderatedTagPage } from '../support/waitHelper';

test.describe('Creating post tests with POM and fixture users', () => {

  test('Validate creating the new post by clicking the nav pencil icon for denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Testing post POM - ${users.denserautotest4.username} - ${timestamp}`;
    const postContentText: string = 'Content of the testing post POM';
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest4Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
    const loginHelper = new LoginHelper(denserAutoTest4Page.page);
    const loginForm = new LoginForm(denserAutoTest4Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest4Page.page);
    const communityPage = new CommunitiesPage(denserAutoTest4Page.page)

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
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest4.username, postTitle, postSummary);
    // After creating post with category user is moving to the created/new page with tag name and Unmoderated tag posts lists
    await expect(communityPage.unmoderatedName).toContainText("Unmoderated tag")
  });

  test('Validate creating the new post by clicking the nav pencil icon for denserautotest0', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Testing post POM - ${users.denserautotest0.username} + ${timestamp}`;
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
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest0.username, postTitle, postSummary);
  });

  test('Validate creating the two posts one by one by clicking the nav pencil icon for denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle1: string = `1 Testing post POM - ${users.denserautotest4.username} + ${timestamp}`;
    const postContentText1: string = '1 Content of the testing post POM';
    const postSummary1: string = '1 My testing post POM';
    const postTag: string = 'test';

    const postTitle2: string = `2 Testing post POM - ${users.denserautotest4.username} + ${timestamp}`;
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
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle1);
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
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle2);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(users.denserautotest4.username, postTitle2, postSummary2);
  });

  test('Attempting to create a post without a title', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible()
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000)
    await expect(postEditorPage.getSubmitPostButton).toBeDisabled()
  });

  test('Attempt to create a post with no content', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible()
    await postEditorPage.getPostTitleInput.fill(postTitle)
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000)
    await expect(postEditorPage.getSubmitPostButton).toBeEnabled()
    await postEditorPage.getSubmitPostButton.click()
    await expect(postEditorPage.getFormContainer).toContainText('String must contain at least 1 character(s)')
  });

  test('Attempt to create a post with no tags', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible()
    await postEditorPage.getPostTitleInput.fill(postTitle)
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await expect(postEditorPage.getFormContainer).toContainText('Required when post to My Blog')
  });

  test('Attempt to create a post with no post summary', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible()
    await postEditorPage.getPostTitleInput.fill(postTitle)
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await expect(postEditorPage.getSubmitPostButton).toBeVisible()
    await postEditorPage.getSubmitPostButton.click();
    await expect(denserAutoTest0Page.page.getByRole('link', { name: 'Content of the testing post POM' }).first()).toBeVisible()
  });

  test('Attempt to create a post with post summary longer than 140 characters', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const LongPostSummary: string = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Donec vulputate, elit nec porta sodales, lacus justo.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Donec vulputate, elit nec porta sodales, lacus justo.';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible()
    await postEditorPage.getPostTitleInput.fill(postTitle)
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await postEditorPage.getPostSummaryInput.fill(LongPostSummary);
    await expect(postEditorPage.getSubmitPostButton).toBeVisible()
    await postEditorPage.getSubmitPostButton.click();
    await expect(denserAutoTest0Page.page.getByText('Maximum 140 characters')).toBeVisible()
  });

  test('After creating post by clicking New Post button in the community, user is moved to the specific community post list page', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const communityPage = new CommunitiesPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    const communityNameText = await denserAutoTest0Page.page.getByTestId('my-subscriptions-community-list').getByRole('link', { name: 'Test wizard' }).innerText()

    await denserAutoTest0Page.page.getByTestId('my-subscriptions-community-list').getByRole('link', { name: 'Test wizard' }).click()
    await communityPage.communityNewPostButton.click()

    await expect(postEditorPage.getPostTitleInput).toBeVisible()
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000)
    await postEditorPage.getSubmitPostButton.click()
    await postEditorPage.page.waitForTimeout(3000);

    await expect(communityPage.communityNameTitle).toBeVisible()
    await expect(communityPage.communityNameTitle).toContainText(communityNameText)
  });

  test('Attempt to create a post with links', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const postPage = new PostPage(denserAutoTest0Page.page);


    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = 'Post with link http://example.com" Example';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible()

    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000)
    await postEditorPage.getSubmitPostButton.click()
    await expect(postPage.postImage.first()).toBeVisible()

    await postPage.postImage.first().click()

    await expect(denserAutoTest0Page.page.locator(postPage.articleBodyString)).toBeVisible()
    await expect(denserAutoTest0Page.page.locator(postPage.articleBodyString)).toContainText(postContentText)

  });

  test('Creating post in the community by clicking the pencil icone and select Post to name of the community', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const postPage = new PostPage(denserAutoTest0Page.page);
    const communitiesPage = new CommunitiesPage(denserAutoTest0Page.page);


    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();

    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000);
    await postPage.postingToDropdown.click();
    await expect(denserAutoTest0Page.page.getByLabel('Test wizard').getByText('Test wizard')).toBeVisible();
    await denserAutoTest0Page.page.getByLabel('Test wizard').getByText('Test wizard').click();
    await postEditorPage.getSubmitPostButton.click();
    await expect(postPage.postImage.first()).toBeVisible();
    await homePage.getTrendingCommunitiesSideBar.locator('a').getByText('Test wizard').click();
    await communitiesPage.validataCommunitiesPageIsLoaded('Test wizard');

    const firstPostTitleText = await homePage.postTitle.first().innerText();

    await expect(firstPostTitleText).toContain(postTitle);
  });
});
