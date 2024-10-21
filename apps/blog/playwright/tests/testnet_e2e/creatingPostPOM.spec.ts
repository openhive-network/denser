import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';

test.describe.skip('Creating post tests with POM and fixture users', () => {
//   let homePage0: HomePage;

//   test.beforeEach(async ({ denserAutoTest4Page }) => {
//     homePage0 = new HomePage(denserAutoTest4Page.page);

//     await homePage0.goto();
//   });

  test('Validate creating the new post by clicking the nav pencil icon', async ({
    denserAutoTest4Page
  }) => {
    const postTitle: string = 'Testing post POM';
    const postContentText: string = 'Content of the testing post POM';
    const postSummary: string = 'My testing post POM';
    const postTag: string = 'test';

    const homePage0 = new HomePage(denserAutoTest4Page.page);
    const postEditorPage = new PostEditorPage(denserAutoTest4Page.page);
    const loginHelper = new LoginHelper(denserAutoTest4Page.page);

    await homePage0.goto();
    // Validate User is logged in as denserautotest4
    await loginHelper.validateLoggedInUser(users.denserautotest4.username);
    // Click to close the profile menu
    await denserAutoTest4Page.page.getByTestId('community-name').locator('..').locator('..').click({ force: true });
    // Click navigation pencil icon to move to the post editor
    await homePage0.getNavCreatePost.click();
    await postEditorPage.validateDefaultPostEditorIsLoaded();
    await denserAutoTest4Page.page.waitForTimeout(5000);
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

    await console.log('111 ', await denserAutoTest4Page.page.context().storageState());

    // Wait for optimistic ui will finished and validate that you are moved to the unmoderated tag page
    await denserAutoTest4Page.page.waitForTimeout(10000);
    await console.log('222 ', await denserAutoTest4Page.page.context().storageState());
    // await denserAutoTest4Page.page.waitForSelector('[data-testid="community-name-unmoderated"]');
    // expect(await denserAutoTest4Page.page.locator('[data-testid="community-name-unmoderated"]').textContent()).toBe(
    //   'Unmoderated tag'
    // );
    // expect(await denserAutoTest4Page.page.locator('[data-testid="community-name"]').textContent()).toBe(`#${postTag}`);
    // // Validate the first post on the unmoderated post list
    // // Validate post's author name
    // expect(
    //   await denserAutoTest4Page.page
    //     .locator('[data-testid="post-list-item"]')
    //     .first()
    //     .locator('[data-testid="post-author"]')
    //     .textContent()
    // ).toBe(users.denserautotest0.username);
    // // Validate the first post's title
    // expect(
    //   await denserAutoTest4Page.page
    //     .locator('[data-testid="post-list-item"]')
    //     .first()
    //     .locator('[data-testid="post-title"]')
    //     .textContent()
    // ).toBe(postTitle);
    // // Validate the first post's summary description
    // expect(
    //   await denserAutoTest4Page.page
    //     .locator('[data-testid="post-list-item"]')
    //     .first()
    //     .locator('[data-testid="post-description"]')
    //     .textContent()
    // ).toBe(postSummary);
  });
});
