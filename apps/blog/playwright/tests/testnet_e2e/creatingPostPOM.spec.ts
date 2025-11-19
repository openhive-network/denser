import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { PostPage } from '../support/pages/postPage';
import { waitForPostIsVisibleInUnmoderatedTagPage } from '../support/waitHelper';
import { generateRandomString } from '../support/utils';
import { AdvancedSettingsModal } from '../support/pages/advancedSettingsModal';

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
    const communityPage = new CommunitiesPage(denserAutoTest4Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest4
    await loginHelper.validateLoggedInUser(users.denserautotest4.username);
    // Click to close the profile menu
    await denserAutoTest4Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest4.username,
      postTitle,
      postSummary
    );
    // After creating post with category user is moving to the created/new page with tag name and Unmoderated tag posts lists
    await expect(communityPage.unmoderatedName).toContainText('Unmoderated tag');
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
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
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
    await denserAutoTest4Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle1, postContentText1, postSummary1, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle1);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest4.username,
      postTitle1,
      postSummary1
    );

    // Create second post
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle2, postContentText2, postSummary2, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle2);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest4.username,
      postTitle2,
      postSummary2
    );
  });

  test('Validate creating the two posts with the same title', async ({ denserAutoTest4Page }) => {
    // The same title - different permlinks
    const randomString: string = generateRandomString();

    const postTitle1: string = `The same title of a post - ${randomString} - ${users.denserautotest4.username}`;
    const expectedPartOfPermling: string = `the-same-title-of-a-post-${randomString.toLocaleLowerCase()}-${users.denserautotest4.username}`;
    const postContentText1: string = 'Content of the testing post POM 1';
    const postSummary1: string = 'My testing post POM 1';
    const postTag: string = 'test';
    const postContentText2: string = 'Content of the testing post POM 2';
    const postSummary2: string = 'My testing post POM 2';

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
    await denserAutoTest4Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle1, postContentText1, postSummary1, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle1);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest4.username,
      postTitle1,
      postSummary1
    );

    // Create second post
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle1, postContentText2, postSummary2, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle1);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest4.username,
      postTitle1,
      postSummary2
    );

    // Get and compare permlinks
    const permlinks: string[] = [];
    const postContent2: Locator = homePage.page.getByText(postContentText2);
    const postContent1: Locator = homePage.page.getByText(postContentText1);
    // Move to the last created post
    await unmoderatedTagPage.firstPostTitle.click();
    await homePage.page.waitForSelector(await postContent2['_selector']);
    // Add url to the array
    permlinks.push(homePage.page.url());
    // Go back
    await homePage.page.goBack();
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Move to the earlier created post with the same title
    await unmoderatedTagPage.secondPostTitle.click();
    await homePage.page.waitForSelector(await postContent1['_selector']);
    // Add url to the array
    permlinks.push(homePage.page.url());
    expect(permlinks[0]).not.toBe(permlinks[1]);
    expect(permlinks[0]).toContain(expectedPartOfPermling);
  });

  test('Attempting to create a post without a title', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';
    const titleErrorMessage: string = 'String must contain at least 2 character(s)';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000);
    await postEditorPage.getSubmitPostButton.click();
    expect(await postEditorPage.getTitleErrorMessage.textContent()).toBe(titleErrorMessage);
  });

  test('Attempt to create a post with no content', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';
    const errorMessage: string = 'String must contain at least 1 character(s)';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000);
    await expect(postEditorPage.getSubmitPostButton).toBeEnabled();
    await postEditorPage.getSubmitPostButton.click();
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('Attempt to create a post with no tags', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const errorMessage: string = 'In posting in My Blog use at least one tag';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getSubmitPostButton.click();
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('Attempt to get error message to use only allowed characters in tags input', async ({
    denserAutoTest0Page
  }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTagWrongCharacter: string = '@';
    const errorMessage: string = 'Use only allowed characters';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    // Wrong character in the post tag input
    await postEditorPage.getEnterYourTagsInput.fill(postTagWrongCharacter);
    await postEditorPage.getSubmitPostButton.click();
    // Check expected error message is visible
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('Attempt to get error message to start with a letter in tags input', async ({
    denserAutoTest0Page
  }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTagWrongCharacter: string = '1';
    const errorMessage: string = 'Must start with a letter';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    // Wrong character in the post tag input
    await postEditorPage.getEnterYourTagsInput.fill(postTagWrongCharacter);
    await postEditorPage.getSubmitPostButton.click();
    // Check expected error message is visible
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('Attempt to get error message to use only lowercase letters in tags input', async ({
    denserAutoTest0Page
  }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTagWrongCharacter: string = 'ABC';
    const errorMessage: string = 'Use only lowercase letters';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    // Wrong character in the post tag input
    await postEditorPage.getEnterYourTagsInput.fill(postTagWrongCharacter);
    await postEditorPage.getSubmitPostButton.click();
    // Check expected error message is visible
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('Attempt to create a post with no post summary', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await expect(postEditorPage.getSubmitPostButton).toBeVisible();
    await postEditorPage.getSubmitPostButton.click();
    await expect(
      denserAutoTest0Page.page.getByRole('link', { name: 'Content of the testing post POM' }).first()
    ).toBeVisible();
  });

  test('Attempt to create a post with markdowns no post summary', async ({ denserAutoTest0Page }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummaryAsMarkdown: string = '~abc~';
    const postTag: string = 'test';
    const errorMessage: string = 'Markdown is not supported here';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    // Set post summary as markdown
    await postEditorPage.getPostSummaryInput.fill(postSummaryAsMarkdown);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await expect(postEditorPage.getSubmitPostButton).toBeVisible();
    await postEditorPage.getSubmitPostButton.click();
    // Check expected error message is visible
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('Attempt to create a post with post summary longer than 140 characters', async ({
    denserAutoTest0Page
  }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const LongPostSummary: string =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Donec vulputate, elit nec porta sodales, lacus justo.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Donec vulputate, elit nec porta sodales, lacus justo.';
    const postTag: string = 'test';
    const errorMessage: string = 'Maximum characters allowed is 140';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await postEditorPage.getPostSummaryInput.fill(LongPostSummary);
    await expect(postEditorPage.getSubmitPostButton).toBeVisible();
    await postEditorPage.getSubmitPostButton.click();
    await expect(denserAutoTest0Page.page.getByText(errorMessage)).toBeVisible();
  });

  test('Attempt to create a post with different author with other characters than letters and numbers', async ({
    denserAutoTest0Page
  }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const wrongAuthorCharacter: string = '#';
    const postTag: string = 'test';
    const errorMessage: string = 'Must contain only letters and numbers';

    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    // Set wrong name of the author
    await postEditorPage.getAuthorInput.fill(wrongAuthorCharacter);
    await expect(postEditorPage.getSubmitPostButton).toBeVisible();
    await postEditorPage.getSubmitPostButton.click();
    // Check expected error message is visible
    await expect(postEditorPage.getFormContainer).toContainText(errorMessage);
  });

  test('After creating post by clicking New Post button in the community, user is moved to the specific community post list page', async ({
    denserAutoTest0Page
  }) => {
    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const communityPage = new CommunitiesPage(denserAutoTest0Page.page);

    const postTitle: string = `1 Testing post POM - ${users.denserautotest0.username}`;
    const postContentText: string = '1 Content of the testing post POM';
    const postSummary: string = '1 My testing post POM';
    const postTag: string = 'test';

    const communityNameText = await denserAutoTest0Page.page
      .getByRole('link', { name: 'Test wizard' })
      .innerText();

    await denserAutoTest0Page.page.getByRole('link', { name: 'Test wizard' }).click();
    await communityPage.communityNewPostButton.click();

    await expect(postEditorPage.getPostTitleInput).toBeVisible();
    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000);
    await postEditorPage.getSubmitPostButton.click();

    await expect(communityPage.communityNameTitle).toBeVisible();
    await expect(communityPage.communityNameTitle).toContainText(communityNameText);
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
    await expect(postEditorPage.getPostTitleInput).toBeVisible();

    await postEditorPage.getPostTitleInput.fill(postTitle);
    await postEditorPage.getEditorContentTextarea.fill(postContentText);
    await postEditorPage.getPostSummaryInput.fill(postSummary);
    await postEditorPage.getEnterYourTagsInput.fill(postTag);
    await denserAutoTest0Page.page.mouse.wheel(0, 2000);
    await postEditorPage.getSubmitPostButton.click();
    await expect(postPage.postImage.first()).toBeVisible();

    await postPage.postImage.first().click();

    await expect(denserAutoTest0Page.page.locator(postPage.articleBodyString)).toBeVisible();
    await expect(denserAutoTest0Page.page.locator(postPage.articleBodyString)).toContainText(postContentText);
  });

  test('Creating post in the community by clicking the pencil icone and select Post to name of the community', async ({
    denserAutoTest0Page
  }) => {
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
    await expect(denserAutoTest0Page.page.getByLabel('Test wizard')).toBeVisible();
    await denserAutoTest0Page.page.getByLabel('Test wizard').click();
    await postEditorPage.getSubmitPostButton.click();
    await expect(postPage.postImage.first()).toBeVisible();
    await homePage.getTrendingCommunitiesSideBar.locator('a').getByText('Test wizard').click();
    await communitiesPage.validataCommunitiesPageIsLoaded('Test wizard');

    const firstPostTitleText = await homePage.postTitle.first().innerText();

    await expect(firstPostTitleText).toContain(postTitle);
  });

  test('Attempt to create a post with Maximum Accepted Payout set to Decline Payout and Author rewards 50%/50%', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Test post with MAP set to Decline Payout and AR set to 50/50 - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string =
      'Content of the testing post POM - Test post with MAP set to Decline Payout and AR set to 50/50';
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Set Decline Payout
    await advancedSettingsModal.declinePayoutMaximumAcceptedPayoutButton.click();
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate the author rewards description is set to `Decline Payout`
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText('Author rewards: Decline Payout');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
    const firstPostCard = await unmoderatedTagPage.firstPostCardFooterDeclinePayout;
    await expect(firstPostCard).toHaveAttribute('title', 'Payout Declined');
  });

  test('Setting a Maximum Accepted Payout to Decline Payout and then setting Author rewards to 100% should be imposible', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Imposible setting Decline Payout and AR set to 100 - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = 'Content - Imposible setting Decline Payout and AR set to 100';
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Set Decline Payout
    await advancedSettingsModal.declinePayoutMaximumAcceptedPayoutButton.click();
    // ! Validate that setting Author rewards to `Power up 100%` is imposible
    await expect(advancedSettingsModal.authorRewardsType100Button).toBeDisabled();
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate the author rewards description is set to `Decline Payout`
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText('Author rewards: Decline Payout');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
    const firstPostCard = await unmoderatedTagPage.firstPostCardFooterDeclinePayout;
    await expect(firstPostCard).toHaveAttribute('title', 'Payout Declined');
  });

  test('Attempt to create a post with Maximum Accepted Payout set to Custom value and Author rewards 50%/50%', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const customValueMaximumAcceptedPayout: string = '60'; //HBD
    const postTitle: string = `Test custom value as ${customValueMaximumAcceptedPayout} and author rewards as 50/50 - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Content - custom value as ${customValueMaximumAcceptedPayout} and AR set to 50/50`;
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Set Custom value of the maximum accepted payout as 60HBD
    await advancedSettingsModal.customValueMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.customValueMaximumAcceptedPayoutInput.fill(customValueMaximumAcceptedPayout);
    // ! Validate that setting Author rewards to `Power up 100%` is imposible
    // await expect(advancedSettingsModal.authorRewardsType100Button).toBeDisabled();
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate Maximum Accepted Payout: 60 HBD
    await expect(postEditorPage.getMaximumAcceptedPayoutDescription).toContainText(
      customValueMaximumAcceptedPayout + ' HBD'
    );
    // Validate the author rewards description is set to `50% HBD / 50% HP`
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText('Author rewards: 50% HBD / 50% HP');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
  });

  test('Attempt to create a post with Maximum Accepted Payout set to Custom value and Author rewards Power up 100%', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const customValueMaximumAcceptedPayout: string = '35'; //HBD
    const postTitle: string = `Test custom value as ${customValueMaximumAcceptedPayout} and author rewards as power up 100 - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Content - custom value as ${customValueMaximumAcceptedPayout} and AR set power up 100`;
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Set Custom value of the maximum accepted payout as 60HBD
    await advancedSettingsModal.customValueMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.customValueMaximumAcceptedPayoutInput.fill(customValueMaximumAcceptedPayout);
    // Set Author rewards to `Power up 100%`
    await advancedSettingsModal.authorRewardsType100Button.click();
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate Maximum Accepted Payout: 35 HBD
    await expect(postEditorPage.getMaximumAcceptedPayoutDescription).toContainText(
      customValueMaximumAcceptedPayout + ' HBD'
    );
    // Validate the author rewards description is set to `Power up 100%`
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText('Author rewards: Power up 100%');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
    // Validate the first pos on the unmoderated post list has `Power Up 100%` icon
    await expect(unmoderatedTagPage.firstPostCardPoweredUp100TriggerLink).toBeVisible();
    await unmoderatedTagPage.firstPostCardPoweredUp100TriggerLink.hover();
    expect(await unmoderatedTagPage.postCardPoweredUp100Tooltip.textContent()).toBe(
      'Powered Up 100%Powered Up 100%'
    );
  });

  test('Attempt to create a post with Maximum Accepted Payout set to No limit and Author rewards Power up 100%', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Test MAP as No limit and author rewards as power up 100 - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Content - MAP as No limit and AR set power up 100`;
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Set Maximum Accepted Payout
    await advancedSettingsModal.noLimitMaximumAcceptedPayoutButton.click();
    // Set Author rewards to `Power up 100%`
    await advancedSettingsModal.authorRewardsType100Button.click();
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate the author rewards description is set to `Power up 100%`
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText('Author rewards: Power up 100%');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
    // Validate the first pos on the unmoderated post list has `Power Up 100%` icon
    await expect(unmoderatedTagPage.firstPostCardPoweredUp100TriggerLink).toBeVisible();
    await unmoderatedTagPage.firstPostCardPoweredUp100TriggerLink.hover();
    expect(await unmoderatedTagPage.postCardPoweredUp100Tooltip.textContent()).toBe(
      'Powered Up 100%Powered Up 100%'
    );
  });

  test('Attempt to create a post with Maximum Accepted Payout set to No limit and Author rewards 50%/50%', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Test MAP as No limit and author rewards as 50/50 - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Content - MAP as No limit and AR set to 50/50`;
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Set Maximum Accepted Payout
    await advancedSettingsModal.noLimitMaximumAcceptedPayoutButton.click();
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate the author rewards description is set to `Power up 100%`
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText('Author rewards: 50% HBD / 50% HP');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
  });

  test('Attempt to create a post with added account in author rewards', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `Test default MAP and AR and more than one user - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Content - default value of maximum accepted payout and author rewards as No limit and AR set to 50/50
    and more than one user: @${users.denserautotest4.username}`;
    const postSummary: string = 'My testing post more author';
    const postTag: string = 'test';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Add another user - denserautotest4
    await advancedSettingsModal.addBeneficiarAccount.click();
    await advancedSettingsModal.addBeneficiarAccountValueInput.fill('30');
    await advancedSettingsModal.addBeneficiarAccountNameInput.fill(`${users.denserautotest4.username}`);
    // Validate valus and name added author and changed value of the main author
    await expect(advancedSettingsModal.addDefaultBeneficiarAccountValueInput).toHaveAttribute('value', '70%');
    await expect(advancedSettingsModal.addBeneficiarAccountValueInput).toHaveAttribute('value', '30');
    await expect(advancedSettingsModal.addBeneficiarAccountNameInput).toHaveAttribute('value', `${users.denserautotest4.username}`);
    // Save Advanced Settings
    await advancedSettingsModal.saveButton.click();
    // Validate the beneficier is set to post options
    await expect(postEditorPage.getBeneficiariesOptionsInfo).toHaveText('Beneficiaries: 1 set');
    // Validate the post editor is open and create simple post
    await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
  });

  test('Add account and delete account in author rewards', async ({
    denserAutoTest0Page
  }) => {
    const timestamp: string = new Date().toString();

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Add another user - denserautotest4
    await advancedSettingsModal.addBeneficiarAccount.click();
    await advancedSettingsModal.addBeneficiarAccountValueInput.fill('30');
    await advancedSettingsModal.addBeneficiarAccountNameInput.fill(`${users.denserautotest4.username}`);
    // Validate valus and name added author and changed value of the main author
    await expect(advancedSettingsModal.addDefaultBeneficiarAccountValueInput).toHaveAttribute('value', '70%');
    await expect(advancedSettingsModal.addBeneficiarAccountValueInput).toHaveAttribute('value', '30');
    await expect(advancedSettingsModal.addBeneficiarAccountNameInput).toHaveAttribute('value', `${users.denserautotest4.username}`);
    // Delete added user - denserautotest4
    await advancedSettingsModal.deleteBeneficiarAccountButton.click();
    // Validate valus of the main author came back to 100%
    await expect(advancedSettingsModal.addDefaultBeneficiarAccountValueInput).toHaveAttribute('value', '100%');
    await expect(advancedSettingsModal.addBeneficiarAccountValueInput).not.toBeVisible();
    await expect(advancedSettingsModal.addBeneficiarAccountNameInput).not.toBeVisible();
  });

  test('Validate error messages for wrong beneficiary account name and value in author rewards', async ({
    denserAutoTest0Page
  }) => {

    const accountName = 'denser';
    const tooMuchPercentage = '1000';
    const msgAccountNameLonger = 'Account name should be longer';
    const msgBeneficiaryPercentage1To100 = 'Beneficiary percentage must be from 1-100';
    const msgBeneficiaryCannotRepeated = 'Beneficiaries cannot be repeated';
    const msgPercentageCannotBeLess0 = 'Your percent cannot be less than 0';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Add another account with empty name - expected message 'Account name should be longer'
    await advancedSettingsModal.addBeneficiarAccount.click();
    await expect(advancedSettingsModal.beneficiariesMessageDialog).toHaveText(msgAccountNameLonger);
    // Add account with name longer than 3 chars - expected message 'Beneficiary percentage must be from 1-100'
    await advancedSettingsModal.addBeneficiarAccountNameInput.fill(accountName);
    await expect(advancedSettingsModal.beneficiariesMessageDialog).toHaveText(msgBeneficiaryPercentage1To100);
    // Type percentage value more then 1000% - expected message 'Your percent cannot be less than 0'
    await advancedSettingsModal.addBeneficiarAccountValueInput.fill(tooMuchPercentage);
    await expect(advancedSettingsModal.beneficiariesMessageDialog).toHaveText(msgPercentageCannotBeLess0);
    // Delete added another beneficiera
    await advancedSettingsModal.deleteBeneficiarAccountButton.click();
    // Add benecifier with no names two times
    await advancedSettingsModal.addBeneficiarAccount.click();
    await advancedSettingsModal.addBeneficiarAccount.click();
    // Expected message 'Beneficiaries cannot be repeated'
    await expect(advancedSettingsModal.beneficiariesMessageDialog).toHaveText(msgBeneficiaryCannotRepeated);
  });

  test('Validate creating the post templates', async ({
    denserAutoTest0Page
  }) => {
    const templateDeclineName = 'templateDecline';
    const templateCustom70Power100 = 'template custom 70 and power up 100';
    const templateNoLimit50Beneficiary = 'template no limit 50/50 beneficiary';
    const authorRewardsDeclinePayoutDescription = 'Author rewards: Decline Payout';
    const authorRewardsPowerUpDescription = 'Author rewards: Power up 100%';
    const authorRewards50Description = 'Author rewards: 50% HBD / 50% HP';
    const maximumAcceptedPayoutDescription = 'Maximum Accepted Payout: 70 HBD';
    const beneficiaryName = 'denserautotest1';
    const beneficiaryValue = '60';
    const beneficiaryDescription = 'Beneficiaries: 1 set';
    const customMAPValue = '70';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Create Decline Payout, 50/50 template
    await advancedSettingsModal.declinePayoutMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.nameOfNewPostTemplateInput.fill(templateDeclineName);
    await advancedSettingsModal.saveButton.click();
    // Validate Decline Payout in the post editor page
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewardsDeclinePayoutDescription);
    // Move to the advanced settings modal and validate there is a decline payout template created
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    await expect(advancedSettingsModal.postTemplateItem).toHaveText(templateDeclineName);
    // Create Custom value 70 and Power up 100 template
    await advancedSettingsModal.customValueMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.customValueMaximumAcceptedPayoutInput.fill(customMAPValue);
    await advancedSettingsModal.authorRewardsType100Button.click();
    await advancedSettingsModal.nameOfNewPostTemplateInput.fill(templateCustom70Power100);
    await advancedSettingsModal.saveButton.click();
    // Validate that MAP is 70 HBD and AR is Power up 100% in the post editor page
    await expect(postEditorPage.getMaximumAcceptedPayoutDescription).toHaveText(maximumAcceptedPayoutDescription);
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewardsPowerUpDescription);
    // Move to the advanced settings modal and validate there is a Custom value 70 and Power up 100 template created
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    expect(await advancedSettingsModal.postTemplateItem.allTextContents()).toContain(templateCustom70Power100);
    // Create No limit, 50 / 50, beneficiary 65% template
    await advancedSettingsModal.noLimitMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.authorRewardsType50Button.click();
    await advancedSettingsModal.addBeneficiarAccount.click();
    await advancedSettingsModal.addBeneficiarAccountValueInput.fill(beneficiaryValue);
    await advancedSettingsModal.addBeneficiarAccountNameInput.fill(beneficiaryName);
    await advancedSettingsModal.nameOfNewPostTemplateInput.fill(templateNoLimit50Beneficiary);
    await advancedSettingsModal.saveButton.click();
    // Validate that AR is 50% HBD / 50% HP and Beneficiaries is 1 set in the post editor page
    await expect(postEditorPage.getBeneficiariesOptionsInfo).toHaveText(beneficiaryDescription);
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewards50Description);
    // Move to the advanced settings modal and validate there is a Custom value 70 and Power up 100 template created
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    expect(await advancedSettingsModal.postTemplateItem.allTextContents()).toContain(templateNoLimit50Beneficiary);
  });

  test('Validate creating templates with post content', async ({
    denserAutoTest0Page
  }) => {
    // Post content
    const timestamp: string = new Date().toString();
    const postTitle: string = `Test title post content template - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Post Content Template - Decline payout as value of maximum accepted payout and author rewards as 50/50`;
    const postSummary: string = 'My testing post content template';
    const postTag: string = 'test';
    // Advanced settings
    const templatePostContentName = 'post content template';
    const authorRewardsDeclinePayoutDescription = 'Author rewards: Decline Payout';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);
    const loginForm = new LoginForm(denserAutoTest0Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Fill in the post form
    await postEditorPage.fillInSimplePost(postTitle, postContentText, postSummary,postTag);
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Create Decline Payout, 50/50 and the post content template
    await advancedSettingsModal.declinePayoutMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.nameOfNewPostTemplateInput.fill(templatePostContentName);
    await advancedSettingsModal.saveButton.click();
    // Validate Decline Payout in the post editor page
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewardsDeclinePayoutDescription);
    // Validate Title of the post
    await expect(postEditorPage.getPostTitleInput).toHaveAttribute('value', postTitle);
    // Validate the post content
    await expect(postEditorPage.getEditorContentTextarea).toHaveText(postContentText);
    // Validate the post summary
    await expect(postEditorPage.getPostSummaryInput).toHaveAttribute('value', postSummary);
    // Validate the tags input
    await expect(postEditorPage.getEnterYourTagsInput).toHaveAttribute('value', postTag);
    // Click Submit button
    await postEditorPage.getSubmitPostButton.click();
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest0.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest0Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest0.username,
      postTitle,
      postSummary
    );
    const firstPostCard = await unmoderatedTagPage.firstPostCardFooterDeclinePayout;
    await expect(firstPostCard).toHaveAttribute('title', 'Payout Declined');
  });

  test('Validate creating and loading templates with post content', async ({
    denserAutoTest0Page
  }) => {
    // Post content
    const timestamp: string = new Date().toString();
    const postTitle: string = `Test loading title post content template - ${users.denserautotest0.username} + ${timestamp}`;
    const postContentText: string = `Post Content Template Loading - Decline payout as value of maximum accepted payout and author rewards as 50/50`;
    const postSummary: string = 'My testing post content template loading';
    const postTag: string = 'test';
    // Advanced settings
    const templatePostContentNameLoad = 'post content template load';
    const authorRewardsDeclinePayoutDescription = 'Author rewards: Decline Payout';
    const authorRewards50Description = 'Author rewards: 50% HBD / 50% HP';

    const homePage = new HomePage(denserAutoTest0Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest0Page.page);
    const advancedSettingsModal = new AdvancedSettingsModal(denserAutoTest0Page.page);
    const loginHelper = new LoginHelper(denserAutoTest0Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest0
    await loginHelper.validateLoggedInUser(users.denserautotest0.username);
    // Click to close the profile menu
    await denserAutoTest0Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is opened
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    // Fill in the post form
    await postEditorPage.fillInSimplePost(postTitle, postContentText, postSummary,postTag);
    // Move to the Advanced Settings
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Create Decline Payout, 50/50 and the post content template
    await advancedSettingsModal.declinePayoutMaximumAcceptedPayoutButton.click();
    await advancedSettingsModal.nameOfNewPostTemplateInput.fill(templatePostContentNameLoad);
    await advancedSettingsModal.saveButton.click();
    // Validate Decline Payout in the post editor page
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewardsDeclinePayoutDescription);
    // Validate Title of the post
    await expect(postEditorPage.getPostTitleInput).toHaveAttribute('value', postTitle);
    // Validate the post content
    await expect(postEditorPage.getEditorContentTextarea).toHaveText(postContentText);
    // Validate the post summary
    await expect(postEditorPage.getPostSummaryInput).toHaveAttribute('value', postSummary);
    // Validate the tags input
    await expect(postEditorPage.getEnterYourTagsInput).toHaveAttribute('value', postTag);
    // Click Clean button and confirm dialog
    denserAutoTest0Page.page.on('dialog', async (dialog) => {
      console.log(`Type of the dialog: ${dialog.type()}`);
      console.log(`Dialog content: ${dialog.message()}`);
      // accept or reject
      if (dialog.message().includes('Are you sure you want to clear')) {
        await dialog.accept();  // Click "OK"
      } else {
        await dialog.dismiss(); // Click "Cancel"
      }
    });
    await postEditorPage.getCleanPostButton.click();
    // Validate the post editor is clean (defaut state)
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewards50Description);
    // Validate Title of the post
    await expect(postEditorPage.getPostTitleInput).toHaveAttribute('value', '');
    // Validate the post content
    await expect(postEditorPage.getEditorContentTextarea).toHaveText('');
    // Validate the post summary
    await expect(postEditorPage.getPostSummaryInput).toHaveAttribute('value', '');
    // Validate the tags input
    await expect(postEditorPage.getEnterYourTagsInput).toHaveAttribute('value', '');
    // Move to the advanced settings modal
    await postEditorPage.getAdvancedSettingsButton.click();
    await advancedSettingsModal.validateAdvancedSettingsModalIsLoaded();
    // Loadad `templatePostContentNameLoad` template
    await advancedSettingsModal.clickSpecificTemplate(templatePostContentNameLoad);
    await advancedSettingsModal.loadTemplateButton.click();
    // Validate Decline Payout in the post editor page
    await expect(postEditorPage.getAuthorRewardsDescription).toHaveText(authorRewardsDeclinePayoutDescription);
    // Validate Title of the post
    await expect(postEditorPage.getPostTitleInput).toHaveAttribute('value', postTitle);
    // Validate the post content
    await expect(postEditorPage.getEditorContentTextarea).toHaveText(postContentText);
    // Validate the post summary
    await expect(postEditorPage.getPostSummaryInput).toHaveAttribute('value', postSummary);
    // Validate the tags input
    await expect(postEditorPage.getEnterYourTagsInput).toHaveAttribute('value', postTag);
  });

  test('Validate creating the new post for different author from denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const timestamp: string = new Date().toString();
    const postAuthor: string = `${users.denserautotest0.username}`;
    const postTitle: string = `Testing post for different autor from ${users.denserautotest4.username} - ${timestamp}`;
    const postContentText: string = `Content of the testing post`;
    const postSummary: string = 'My testing post other author';
    const postTag: string = 'test';
    const thisPostIsAuthoredBy: string = `Authored by @${postAuthor}`;

    const homePage = new HomePage(denserAutoTest4Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
    const postPage = new PostPage(denserAutoTest4Page.page);
    const loginHelper = new LoginHelper(denserAutoTest4Page.page);
    const loginForm = new LoginForm(denserAutoTest4Page.page);
    const unmoderatedTagPage = new UnmoderatedTagPage(denserAutoTest4Page.page);
    const communityPage = new CommunitiesPage(denserAutoTest4Page.page);

    await homePage.goto();
    // Validate User is logged in as denserautotest4
    await loginHelper.validateLoggedInUser(users.denserautotest4.username);
    // Click to close the profile menu
    await denserAutoTest4Page.page
      .getByTestId('community-name')
      .locator('..')
      .locator('..')
      .click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage.getNavCreatePost.click();
    // Validate the post editor is open and create simple post
    await postEditorPage.createPostByDifferentAuthor(postTitle, postContentText, postSummary, postTag, postAuthor);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
    // Validate that user has been moved to the unmoderated tag page
    await unmoderatedTagPage.validateUnmoderatedTagPageIsLoaded(postTag);
    // Wait until optimistic ui is finished
    await waitForPostIsVisibleInUnmoderatedTagPage(denserAutoTest4Page.page, postTitle);
    // Validate the first post on the unmoderated post list
    await unmoderatedTagPage.validateFirstPostInTheUnmoderatedTagList(
      users.denserautotest4.username,
      postTitle,
      postSummary
    );
    // After creating post with category user is moving to the created/new page with tag name and Unmoderated tag posts lists
    await expect(communityPage.unmoderatedName).toContainText('Unmoderated tag');
    // Move to the latest post
    await unmoderatedTagPage.page.getByText(postTitle).click();
    // Validate the post and if it is authored by @denserautotest0
    await postPage.validatePostTitle(postTitle);
    await postPage.validatePostContantContainText(postContentText, postContentText);
    await expect(postPage.authoredBy).toHaveText(thisPostIsAuthoredBy);
  });
});
