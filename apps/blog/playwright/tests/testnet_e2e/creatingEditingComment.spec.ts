import { test, expect } from '../../fixtures';
import { HomePage } from '../support/pages/homePage';
import { users, LoginHelper } from '../support/loginHelper';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { UnmoderatedTagPage } from '../support/pages/unmoderatedTagPage';

function generateRandomString(length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}

test.describe.serial('Creating and editing comments with POM and fixture users', () => {
  test('Validate creating the new comment for post of denserautotest4', async ({
    denserAutoTest4Page
  }) => {
    const loginForm = new LoginForm(denserAutoTest4Page.page);
    // Move to the post test-39 of denserautotest4
    await denserAutoTest4Page.page.goto('/test/@denserautotest4/post-test-39');
    // Validate the correct post is loaded
    await expect(denserAutoTest4Page.page.getByTestId('article-title')).toHaveText('test-39');
    await expect(denserAutoTest4Page.page.locator('#articleBody:has-text("Test 39")')).toHaveText('content Test 39 numer');
    // Click Reply to open the comment editor
    await denserAutoTest4Page.page.getByTestId('comment-reply').click();
    // Validate the empty reply editor is loaded
    await expect(denserAutoTest4Page.page.getByTestId('reply-editor')).toBeVisible();
    await expect(denserAutoTest4Page.page.getByText('Disable side-by-side editor')).toBeVisible();
    await expect(denserAutoTest4Page.page.getByTestId('reply-editor').locator('textarea')).toBeVisible();
    await expect(denserAutoTest4Page.page.locator('button:text("Post")')).toBeDisabled();
    await expect(denserAutoTest4Page.page.locator('button:text("Cancel")')).toBeEnabled();
    // Add conntent to the textarea
    const randomString: string = generateRandomString();
    const commentContent: string = `Comment test content ${randomString}`;
    await denserAutoTest4Page.page.getByTestId('reply-editor').locator('textarea').fill(commentContent);
    // Validate the content is displayed in the comment preview
    await expect(denserAutoTest4Page.page.getByTestId('reply-editor').locator('#articleBody > p')).toHaveText(commentContent);
    // Validate the Post button is clickable
    await expect(denserAutoTest4Page.page.locator('button:text("Post")')).toBeEnabled();
    // Click the Post button
    await denserAutoTest4Page.page.locator('button:text("Post")').click();
    // If a password to unlock key is needed
    await loginForm.page.waitForTimeout(2000);
    await loginForm.putEnterYourPasswordToUnlockKeyIfNeeded(users.denserautotest4.safeStoragePassword)
    // Validate the new comment was created
    await denserAutoTest4Page.page.getByTestId('reply-editor').waitFor( {state: 'detached'});
    await denserAutoTest4Page.page.waitForTimeout(5000);
    await denserAutoTest4Page.page.reload({ waitUntil: 'load' });
    await expect(denserAutoTest4Page.page.getByTestId('comment-list-item').getByTestId('comment-card-description').locator('#articleBody > p').getByText(randomString)).toHaveText(commentContent);
  });
});
