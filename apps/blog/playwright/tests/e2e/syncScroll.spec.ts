import { expect, test } from '@playwright/test';
import { loginAndOpenEditor, hasEditorCredentials } from '../support/testHelpers';

test.describe('Sync scroll tests', () => {
  // Skip tests if credentials are not available
  test.skip(
    () => !hasEditorCredentials(),
    'CI_TEST_USER and CI_TEST_USER_WIF_POSTING environment variables are required'
  );

  // Generate content to make both editor and preview scrollable
  // Keep it short enough for keyboard.type() to be fast but tall enough to scroll
  const generateLongContent = (): string => {
    let content = '# Test\n\n';
    // 30 lines should be enough to create scrollable content (~300 chars)
    for (let i = 1; i <= 30; i++) {
      content += `Line ${i}\n\n`;
    }
    content += '# End';
    return content;
  };

  /**
   * Login and fill the editor with scrollable content.
   * Returns the postEditorPage and scroller locators.
   */
  async function setupEditorWithContent(page: import('@playwright/test').Page) {
    const { postEditorPage } = await loginAndOpenEditor(page);

    // Wait for the CodeMirror editor scroller to be available in the DOM
    await expect(postEditorPage.getEditorScroller).toBeVisible({ timeout: 20000 });

    // Verify side-by-side mode is enabled and preview is visible
    await expect(postEditorPage.getPreviewContainer).toBeVisible();
    await expect(postEditorPage.getFormContainer).toBeVisible();

    // Fill in the editor with content using keyboard.type()
    // This triggers CodeMirror's change events properly
    const longContent = generateLongContent();
    await postEditorPage.getEditorContentTextarea.click();
    await page.keyboard.type(longContent, { delay: 0 });

    // Wait for preview to render the content
    await expect(postEditorPage.getPreviewContainer).toContainText('Line 1', { timeout: 5000 });

    return {
      postEditorPage,
      editorScroller: postEditorPage.getEditorScroller,
      previewScroller: postEditorPage.getPreviewScroller
    };
  }

  test('@flaky Sync scroll works immediately after page load without toggling', async ({ page }) => {
    const { editorScroller, previewScroller } = await setupEditorWithContent(page);

    const previewScrollTop = () => previewScroller.evaluate((el) => el.scrollTop);

    // Scroll the editor to a fraction of its scrollable range and dispatch a
    // real scroll event — setting scrollTop alone doesn't trigger the listener.
    const scrollEditorToFraction = async (fraction: number) => {
      await editorScroller.evaluate((el, f) => {
        el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
        el.dispatchEvent(new Event('scroll', { bubbles: true }));
      }, fraction);
    };

    // Both panes must actually be scrollable, otherwise the test proves nothing.
    const editorScrollable = await editorScroller.evaluate((el) => el.scrollHeight - el.clientHeight);
    const previewScrollable = await previewScroller.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(editorScrollable).toBeGreaterThan(0);
    expect(previewScrollable).toBeGreaterThan(0);

    // Reset to the top first. keyboard.type() leaves the caret at the end, so
    // the editor sits near the bottom and use-scroll-sync's "auto-scroll preview
    // to bottom" effect pins the preview at the bottom — which would race with
    // and defeat the checks below. Scrolling back to the top clears that state
    // and also asserts the top→top endpoint of the mapping.
    await scrollEditorToFraction(0);
    await expect
      .poll(previewScrollTop, { message: 'Preview should follow the editor to the top', timeout: 2000 })
      .toBeLessThan(20);

    // Scrolling the editor down must move the preview down (sync responds).
    await scrollEditorToFraction(0.5);
    await expect
      .poll(previewScrollTop, {
        message: 'Preview should scroll in response to editor scroll',
        timeout: 2000
      })
      .toBeGreaterThan(0);
    const previewAtMid = await previewScrollTop();

    // Scrolling the editor to the bottom must move the preview strictly further
    // down, and land near the preview's own bottom. We assert this monotonic
    // top→mid→bottom relationship and the endpoint rather than an exact target
    // percentage: the sync uses block-anchor mapping (use-scroll-sync.ts), so
    // the editor's 50% does NOT correspond to the preview's 50% for arbitrary
    // content — the old `0.3 < pct < 0.7` assertion was checking an invariant
    // the algorithm never guaranteed.
    await scrollEditorToFraction(1);
    await expect
      .poll(previewScrollTop, {
        message: 'Preview should scroll further as the editor reaches the bottom',
        timeout: 2000
      })
      .toBeGreaterThan(previewAtMid);
    expect(await previewScrollTop()).toBeGreaterThan(previewScrollable * 0.8);
  });

  test('@flaky Sync scroll toggle disables and enables scroll synchronization', async ({ page }) => {
    const { postEditorPage, editorScroller, previewScroller } = await setupEditorWithContent(page);

    // Helper: hover container, reliably reveal the toggle, then click it.
    const clickSyncToggle = async () => {
      await postEditorPage.getSyncScrollContainer.hover();
      await postEditorPage.getSyncScrollToggle.waitFor({ state: 'visible', timeout: 2000 });
      await postEditorPage.getSyncScrollToggle.click();
    };

    // Helper: trigger a real scroll on the editor via mouse wheel.
    // Setting scrollTop + dispatchEvent('scroll') is racy on Firefox because
    // the sync hook RAF-debounces and the synthetic event can be coalesced
    // away. mouse.wheel produces native scroll events with the timing the
    // listener actually expects.
    const wheelEditorBy = async (deltaY: number) => {
      const box = await editorScroller.boundingBox();
      if (!box) throw new Error('editor scroller has no bounding box');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, deltaY);
    };

    // Reset scroll positions
    await editorScroller.evaluate((el) => { el.scrollTop = 0; });
    await previewScroller.evaluate((el) => { el.scrollTop = 0; });

    // Wait for scroll positions to settle
    await expect.poll(
      () => editorScroller.evaluate((el) => el.scrollTop),
      { timeout: 1000 }
    ).toBe(0);

    // Click the sync scroll toggle to disable sync
    await clickSyncToggle();

    // Scroll the editor — sync should NOT propagate to preview
    const editorScrollInfo = await editorScroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    }));
    const targetScroll = (editorScrollInfo.scrollHeight - editorScrollInfo.clientHeight) * 0.5;
    await wheelEditorBy(targetScroll);

    // Wait for editor scroll to actually take effect
    await expect.poll(
      () => editorScroller.evaluate((el) => el.scrollTop),
      { timeout: 2000 }
    ).toBeGreaterThan(0);

    // Preview should NOT have scrolled (sync is disabled)
    const previewScrollAfterDisabled = await previewScroller.evaluate((el) => el.scrollTop);
    expect(previewScrollAfterDisabled).toBeLessThan(50); // Should be near 0

    // Re-enable sync scroll
    await clickSyncToggle();

    // Reset editor to top
    await editorScroller.evaluate((el) => { el.scrollTop = 0; });
    await expect.poll(
      () => editorScroller.evaluate((el) => el.scrollTop),
      { timeout: 1000 }
    ).toBe(0);

    // Scroll editor with real wheel input — preview should now sync.
    await wheelEditorBy(targetScroll);

    await expect.poll(
      () => previewScroller.evaluate((el) => el.scrollTop),
      { message: 'Preview should sync after re-enabling toggle', timeout: 5000 }
    ).toBeGreaterThan(50);
  });
});
