import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { PostEditorPage } from '../support/pages/postEditorPage';

test.describe('Sync scroll tests', () => {
  let homePage: HomePage;
  let loginForm: LoginForm;
  let postEditorPage: PostEditorPage;

  const user = {
    username: process.env.CI_TEST_USER as string,
    password: 'testtest',
    keys: {
      posting: process.env.CI_TEST_USER_WIF_POSTING as string
    }
  };

  // Generate long content to make both editor and preview scrollable
  const generateLongContent = (): string => {
    const lines: string[] = [];
    lines.push('# Sync Scroll Test Content\n');
    for (let i = 1; i <= 50; i++) {
      lines.push(`## Section ${i}\n`);
      lines.push(`This is paragraph ${i} with some content to make the editor scrollable.\n`);
      lines.push(`Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n`);
      lines.push('\n');
    }
    lines.push('## End of Content\n');
    lines.push('This is the last section of the test content.');
    return lines.join('');
  };

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    loginForm = new LoginForm(page);
    postEditorPage = new PostEditorPage(page);
  });

  test('Sync scroll works immediately after page load without toggling', async ({ page }) => {
    // Login
    await homePage.goto();
    await homePage.loginBtn.click();
    await loginForm.validateDefaultLoginFormIsLoaded();
    await loginForm.usernameInput.fill(user.username);
    await loginForm.passwordInput.fill(user.password);
    await loginForm.wifInput.fill(user.keys.posting);
    await loginForm.saveSignInButton.click();

    // Wait for login to complete
    await expect(homePage.profileAvatarButton).toBeVisible({ timeout: 15000 });

    // Navigate to post editor
    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible({ timeout: 15000 });

    // Wait for the CodeMirror editor scroller to be available in the DOM
    // This is crucial - the MutationObserver fix should ensure .cm-scroller exists
    await expect(postEditorPage.getEditorScroller).toBeVisible({ timeout: 15000 });

    // Verify side-by-side mode is enabled and preview is visible
    await expect(postEditorPage.getPreviewContainer).toBeVisible();
    await expect(postEditorPage.getFormContainer).toBeVisible();

    // Fill in the editor with long content
    const longContent = generateLongContent();
    await postEditorPage.getEditorContentTextarea.click();
    await page.keyboard.type(longContent, { delay: 0 });

    // Wait for preview to render
    await page.waitForTimeout(500);

    // Get the editor scroller element
    const editorScroller = postEditorPage.getEditorScroller;
    const previewContainer = postEditorPage.getPreviewContainer;

    // Verify both containers are scrollable (have scrollHeight > clientHeight)
    const editorScrollInfo = await editorScroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop
    }));

    const previewScrollInfo = await previewContainer.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop
    }));

    // Verify both containers have scrollable content
    expect(editorScrollInfo.scrollHeight).toBeGreaterThan(editorScrollInfo.clientHeight);
    expect(previewScrollInfo.scrollHeight).toBeGreaterThan(previewScrollInfo.clientHeight);

    // Scroll the editor to approximately 50%
    const targetEditorScrollTop =
      (editorScrollInfo.scrollHeight - editorScrollInfo.clientHeight) * 0.5;
    await editorScroller.evaluate((el, scrollTop) => {
      el.scrollTop = scrollTop;
    }, targetEditorScrollTop);

    // Wait for scroll sync to occur (RAF-based, should be fast)
    await page.waitForTimeout(200);

    // Get preview scroll position after editor scroll
    const previewScrollTopAfter = await previewContainer.evaluate((el) => el.scrollTop);

    // Verify preview scrolled - it should be roughly at 50% as well
    // Allow some tolerance due to different content heights
    const maxPreviewScroll = previewScrollInfo.scrollHeight - previewScrollInfo.clientHeight;
    const previewScrollPercentage = previewScrollTopAfter / maxPreviewScroll;

    // The preview should have scrolled to approximately the same percentage (within 20% tolerance)
    expect(previewScrollPercentage).toBeGreaterThan(0.3);
    expect(previewScrollPercentage).toBeLessThan(0.7);
  });

  test('Sync scroll toggle disables and enables scroll synchronization', async ({ page }) => {
    // Login
    await homePage.goto();
    await homePage.loginBtn.click();
    await loginForm.validateDefaultLoginFormIsLoaded();
    await loginForm.usernameInput.fill(user.username);
    await loginForm.passwordInput.fill(user.password);
    await loginForm.wifInput.fill(user.keys.posting);
    await loginForm.saveSignInButton.click();

    // Wait for login to complete
    await expect(homePage.profileAvatarButton).toBeVisible({ timeout: 15000 });

    // Navigate to post editor
    await homePage.getNavCreatePost.click();
    await expect(postEditorPage.getPostTitleInput).toBeVisible({ timeout: 15000 });
    await expect(postEditorPage.getEditorScroller).toBeVisible({ timeout: 15000 });

    // Fill in the editor with long content
    const longContent = generateLongContent();
    await postEditorPage.getEditorContentTextarea.click();
    await page.keyboard.type(longContent, { delay: 0 });
    await page.waitForTimeout(500);

    const editorScroller = postEditorPage.getEditorScroller;
    const previewContainer = postEditorPage.getPreviewContainer;

    // Reset scroll positions
    await editorScroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await previewContainer.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(200);

    // Click the sync scroll toggle to disable sync
    // The button is initially hidden, so hover over the container to reveal it
    await postEditorPage.getSyncScrollContainer.hover();
    await postEditorPage.getSyncScrollToggle.click();
    await page.waitForTimeout(100);

    // Scroll the editor
    const editorScrollInfo = await editorScroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    }));
    const targetScroll = (editorScrollInfo.scrollHeight - editorScrollInfo.clientHeight) * 0.5;
    await editorScroller.evaluate((el, scrollTop) => {
      el.scrollTop = scrollTop;
    }, targetScroll);
    await page.waitForTimeout(200);

    // Preview should NOT have scrolled (sync is disabled)
    const previewScrollAfterDisabled = await previewContainer.evaluate((el) => el.scrollTop);
    expect(previewScrollAfterDisabled).toBeLessThan(50); // Should be near 0

    // Re-enable sync scroll
    await postEditorPage.getSyncScrollContainer.hover();
    await postEditorPage.getSyncScrollToggle.click();
    await page.waitForTimeout(100);

    // Reset editor to top
    await editorScroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(200);

    // Scroll editor again
    await editorScroller.evaluate((el, scrollTop) => {
      el.scrollTop = scrollTop;
    }, targetScroll);
    await page.waitForTimeout(200);

    // Now preview should have scrolled (sync is re-enabled)
    const previewScrollAfterEnabled = await previewContainer.evaluate((el) => el.scrollTop);
    expect(previewScrollAfterEnabled).toBeGreaterThan(50);
  });
});
