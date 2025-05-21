import { test, expect } from '../../fixtures';
import { users, LoginHelper } from '../support/loginHelper';
import { LoginForm } from '../support/pages/loginForm';
import { CommentEditorPage } from '../support/pages/commentEditorPage';
import { generateRandomString } from '../support/utils';
import { PostPage } from '../support/pages/postPage';


test.describe.serial('Creating and editing comments with POM and fixture users', () => {
  test('Validate creating the new comment for post of denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const loginForm = new LoginForm(denserAutoTest4Page.page);
    const commentEditorPage = new CommentEditorPage(denserAutoTest4Page.page);
    const postPage = new PostPage(denserAutoTest4Page.page);

    // Move to the post test-39 of denserautotest4
    await denserAutoTest4Page.page.goto('/test/@denserautotest4/post-test-39');
    // Validate the correct post is loaded
    await postPage.validatePostTitle('test-39');
    await postPage.validatePostContantContainText('Test 39', 'content Test 39 numer')
    // Click Reply to open the comment editor
    await commentEditorPage.getPostReplayButton.click();
    // Validate the empty reply editor is loaded
    await commentEditorPage.validateEmptyCommentEditorIsLoaded();
    // Add conntent to the textarea
    const randomString: string = generateRandomString();
    const commentContent: string = `Comment test content ${randomString}`;
    await commentEditorPage.createSimpleComment(commentContent);
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword)
    // Validate the new comment was created
    // Be careful the optimistic ui doesn't always work well!!!
    await commentEditorPage.getReplayEditorElement.waitFor( {state: 'detached'});
    await denserAutoTest4Page.page.waitForTimeout(5000);
    await denserAutoTest4Page.page.reload({ waitUntil: 'load' });
    await expect(await commentEditorPage.findCreatedCommentContentByText(randomString)).toHaveText(commentContent);
  });
});
