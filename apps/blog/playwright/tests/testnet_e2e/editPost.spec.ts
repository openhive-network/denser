import { test, expect, Locator } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { PostPage } from '../support/pages/postPage';
import { waitForPostIsVisibleInUnmoderatedTagPage } from '../support/waitHelper';

test.describe('Creating a post and edit it with POM and fixture users', () => {
  test.describe.serial('Create a post and edit it in serial tests', () => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `The post to edit it - ${users.denserautotest4.username} - ${timestamp}`;
    const postContentText: string = 'Test post content';
    const postSummary: string = 'Edit me';
    const postTag: string = 'test';

    test('Create the new post by clicking the nav pencil icon for denserautotest4 in a unmoderated tag test', async ({
      denserAutoTest4Page
    }) => {
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
      await homePage.clickToCloseProfileMenu();
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

    test('Edit the post of denserautotest4 in a unmoderated tag test', async ({ denserAutoTest4Page }) => {
      const timestamp: string = new Date().toString();
      const postEditedContentText: string = 'The new conntent after editing';
      const postEditedTitleText: string = `Edited title ${timestamp}`;
      const postEditedSummary: string = `I'm edited`;
      const postEditedTag: string = 'spam edit';
      const postEditedTagExpected: string = '#spam#edit';

      const homePage = new HomePage(denserAutoTest4Page.page);
      const postPage = new PostPage(denserAutoTest4Page.page);
      const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
      const loginForm = new LoginForm(denserAutoTest4Page.page);

      // Move to the denserautotest4 the Blog tab in the profile page
      await homePage.gotoSpecificUrl(`/@${users.denserautotest4.username}`);
      await expect(homePage.getFirstPostTitle).toContainText(postTitle);
      await expect(homePage.postDescription.first()).toContainText(postSummary);
      // Move inside the first post on the list of posts of denserautotest4
      await homePage.getFirstPostTitle.click();
      await postPage.page.waitForSelector(postPage.articleTitle['_selector']);
      await postPage.validatePostTitle(postTitle);
      await postPage.validatePostContantContainText(postContentText, postContentText);
      // Click post edit button
      await postPage.postEditButton.click();
      // Validate the post editor is opened
      await postEditorPage.validateThePostEditorOfSpecificPostIsLoaded(
        postTitle,
        postContentText,
        postSummary,
        postTag
      );
      // Edit the post title, content, summary, tags
      await postEditorPage.getPostTitleInput.fill(postEditedTitleText);
      await postEditorPage.getEditorContentTextarea.fill(postEditedContentText);
      await postEditorPage.getPostSummaryInput.fill(postEditedSummary);
      await postEditorPage.getEnterYourTagsInput.fill(postEditedTag);
      await postEditorPage.getSubmitPostButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Validate the post is edited
      await expect(await postPage.articleTitle).toHaveText(postEditedTitleText);
      await expect(await postPage.articleBody).toContainText(postEditedContentText);
      await expect(await postPage.hashtagsPosts.textContent()).toBe(postEditedTagExpected);
    });
  });

  test.describe.serial('Create a post and edit it for specific community in serial tests', () => {
    const timestamp: string = new Date().toString();
    const communitySelectOptionValue: string = 'hive-100005'; // Lifestyle
    const postTitle: string = `The post to edit it in community - ${users.denserautotest4.username} - ${timestamp}`;
    const postContentText: string = 'Test post content - community';
    const postSummary: string = 'Edit me - community';
    const postTag: string = 'test';

    test('Create the new post by clicking the nav pencil icon for denserautotest4 in a specific community', async ({
      denserAutoTest4Page
    }) => {
      const homePage = new HomePage(denserAutoTest4Page.page);
      const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const communityPage = new CommunitiesPage(denserAutoTest4Page.page);

      await homePage.goto();
      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await homePage.clickToCloseProfileMenu();
      // Click navigation pencil icon to move to the post editor
      await homePage.getNavCreatePost.click();
      // Validate the post editor is open and create simple post for the Lifestyle community
      await postEditorPage.createSimplePostForCommunity(postTitle, postContentText, postSummary, postTag, communitySelectOptionValue);
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Validate that user has been moved to the Lifestyle community page
      await communityPage.quickValidataCommunitiesPageIsLoaded('Lifestyle');
      // Validate that created post is on the community's post list
      await expect(await communityPage.postTitle.allTextContents()).toContain(postTitle);
    });

    test('Edit the post of denserautotest4 in a specific community', async ({ denserAutoTest4Page }) => {
      const timestamp: string = new Date().toString();
      const postEditedContentText: string = 'The new conntent after editing in community';
      const postEditedTitleText: string = `Edited title in community ${timestamp}`;
      const postEditedSummary: string = `I'm edited post in community`;
      const postEditedTag: string = 'spam edit';
      const postEditedTagExpected: string = '#spam#edit';

      const homePage = new HomePage(denserAutoTest4Page.page);
      const postPage = new PostPage(denserAutoTest4Page.page);
      const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
      const loginForm = new LoginForm(denserAutoTest4Page.page);

      // Move to the denserautotest4 the Post tab in the profile page
      await homePage.gotoSpecificUrl(`/@${users.denserautotest4.username}/posts`);
      await expect(homePage.getFirstPostTitle).toContainText(postTitle);
      await expect(homePage.postDescription.first()).toContainText(postSummary);
      // Move inside the first post on the list of posts of denserautotest4
      await homePage.getFirstPostTitle.click();
      await postPage.page.waitForSelector(postPage.articleTitle['_selector']);
      await postPage.validatePostTitle(postTitle);
      await postPage.validatePostContantContainText(postContentText, postContentText);
      // Click post edit button
      await postPage.postEditButton.click();
      // Validate the post editor is opened
      await postEditorPage.validateThePostEditorOfSpecificPostIsLoaded(
        postTitle,
        postContentText,
        postSummary,
        postTag
      );
      // Edit the post title, content, summary, tags
      await postEditorPage.getPostTitleInput.fill(postEditedTitleText);
      await postEditorPage.getEditorContentTextarea.fill(postEditedContentText);
      await postEditorPage.getPostSummaryInput.fill(postEditedSummary);
      await postEditorPage.getEnterYourTagsInput.fill(postEditedTag);
      await postEditorPage.getSubmitPostButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Validate the post is edited
      await expect(await postPage.articleTitle).toHaveText(postEditedTitleText);
      await expect(await postPage.articleBody).toContainText(postEditedContentText);
      await expect(await postPage.hashtagsPosts.textContent()).toBe(postEditedTagExpected);
    });
  });

  test.describe.serial('Move to the specific community, create and edit a post in serial tests', () => {
    const timestamp: string = new Date().toString();
    const postTitle: string = `The post to edit by the community - ${users.denserautotest4.username} - ${timestamp}`;
    const postContentText: string = 'Test post content - by the community';
    const postSummary: string = 'Edit me - by the community';
    const postTag: string = 'test';

    test('Move to the Lifestyle community and create the new post for denserautotest4 in a specific community', async ({
      denserAutoTest4Page
    }) => {
      const lifestyleCommunityLocator: Locator = denserAutoTest4Page.page.locator('ul').filter({ hasText: /^Lifestyle$/ }).getByRole('link');
      const homePage = new HomePage(denserAutoTest4Page.page);
      const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const communityPage = new CommunitiesPage(denserAutoTest4Page.page);

      await homePage.goto();
      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await homePage.clickToCloseProfileMenu();
      // Move to the Lifestyle community
      await lifestyleCommunityLocator.click();
      // Validate that user has been moved to the Lifestyle community page
      await communityPage.quickValidataCommunitiesPageIsLoaded('Lifestyle');
      // Click New Post button
      await communityPage.communityNewPostButton.click();
      // Validate the post editor is opened
      await postEditorPage.validateDefaultPostEditorForSpecificCommunityIsLoaded('Lifestyle');
      // Validate the post editor is open and create simple post for the Lifestyle community
      await postEditorPage.createSimplePost(postTitle, postContentText, postSummary, postTag);
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Validate that user has been moved to the Lifestyle community page
      await communityPage.quickValidataCommunitiesPageIsLoaded('Lifestyle');
      // Validate that created post is on the community's post list
      await expect(await communityPage.postTitle.allTextContents()).toContain(postTitle);
    });

    test('Edit the post of denserautotest4 of the specific community', async ({ denserAutoTest4Page }) => {
      const lifestyleCommunityLocator: Locator = denserAutoTest4Page.page.locator('ul').filter({ hasText: /^Lifestyle$/ }).getByRole('link');
      const timestamp: string = new Date().toString();
      const postEditedContentText: string = 'The new conntent after editing in community';
      const postEditedTitleText: string = `Edited title in community ${timestamp}`;
      const postEditedSummary: string = `I'm edited post in community`;
      const postEditedTag: string = 'spam edit';
      const postEditedTagExpected: string = '#spam#edit';

      const homePage = new HomePage(denserAutoTest4Page.page);
      const postPage = new PostPage(denserAutoTest4Page.page);
      const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
      const loginHelper = new LoginHelper(denserAutoTest4Page.page);
      const loginForm = new LoginForm(denserAutoTest4Page.page);
      const communityPage = new CommunitiesPage(denserAutoTest4Page.page);

      await homePage.goto();
      // Validate User is logged in as denserautotest4
      await loginHelper.validateLoggedInUser(users.denserautotest4.username);
      // Click to close the profile menu
      await homePage.clickToCloseProfileMenu();
      // Move to the Lifestyle community
      await lifestyleCommunityLocator.click();
      // Validate that user has been moved to the Lifestyle community page
      await communityPage.quickValidataCommunitiesPageIsLoaded('Lifestyle');
      // Find created post and move inside
      await denserAutoTest4Page.page.getByText(postTitle).click();
      await postPage.page.waitForSelector(postPage.articleTitle['_selector']);
      await postPage.validatePostTitle(postTitle);
      await postPage.validatePostContantContainText(postContentText, postContentText);
      // Click post edit button
      await postPage.postEditButton.click();
      // Validate the post editor is opened
      await postEditorPage.validateThePostEditorOfSpecificPostIsLoaded(
        postTitle,
        postContentText,
        postSummary,
        postTag
      );
      // Edit the post title, content, summary, tags
      await postEditorPage.getPostTitleInput.fill(postEditedTitleText);
      await postEditorPage.getEditorContentTextarea.fill(postEditedContentText);
      await postEditorPage.getPostSummaryInput.fill(postEditedSummary);
      await postEditorPage.getEnterYourTagsInput.fill(postEditedTag);
      await postEditorPage.getSubmitPostButton.click();
      // If a password to unlock key is needed
      await loginForm.page.waitForTimeout(2000);
      await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword);
      // Validate the post is edited
      await expect(await postPage.articleTitle).toHaveText(postEditedTitleText);
      await expect(await postPage.articleBody).toContainText(postEditedContentText);
      await expect(await postPage.hashtagsPosts.textContent()).toBe(postEditedTagExpected);
    });
  });

});
