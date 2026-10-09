import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { fillPostBody, gotoSubmitLoggedIn } from '../support/postCreationContext';

/**
 * Post creation — editor/preview sync scroll (use-scroll-sync.ts).
 * Offline port of e2e/syncScroll.spec.ts, which needs a live login; the
 * live spec stays as an optional smoke test.
 *
 * Re-uses the `postCreate` fixture set: only the /submit.html page load
 * hits RPCs, scrolling is client-side.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateSyncScroll.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

const SCROLLABLE_LINE_COUNT = 30;
const LAST_LINE = `Line ${SCROLLABLE_LINE_COUNT}`;

function scrollableBody(): string {
  const lines = Array.from({ length: SCROLLABLE_LINE_COUNT }, (_, i) => `Line ${i + 1}`);
  return ['# Test', ...lines, '# End'].join('\n\n');
}

async function openEditorWithScrollableBody(page: Page) {
  await gotoSubmitLoggedIn(page);
  const editor = new PostEditorPage(page);
  await editor.validateDefaultPostEditorIsLoaded();
  await fillPostBody(page, scrollableBody());
  await expect(editor.getPreviewContainer).toContainText(LAST_LINE);
  return editor;
}

const scrollTop = (scroller: Locator) => scroller.evaluate((el) => el.scrollTop);
const scrollableHeight = (scroller: Locator) =>
  scroller.evaluate((el) => el.scrollHeight - el.clientHeight);

// Setting scrollTop alone doesn't reach the sync listener; dispatch the event too.
async function scrollToFraction(scroller: Locator, fraction: number) {
  await scroller.evaluate((el, f) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
    el.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, fraction);
}

// Real wheel input: the sync hook RAF-debounces, and a synthetic scroll
// event can be coalesced away before it runs.
async function wheelOver(page: Page, scroller: Locator, deltaY: number) {
  const box = await scroller.boundingBox();
  if (!box) throw new Error('editor scroller has no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
}

async function clickSyncToggle(editor: PostEditorPage) {
  await editor.getSyncScrollContainer.hover();
  await editor.getSyncScrollToggle.click();
}

test.describe('Post creation — sync scroll (§2.1)', () => {
  test('preview follows the editor right after page load', async ({ page }) => {
    const editor = await openEditorWithScrollableBody(page);
    const editorScroller = editor.getEditorScroller;
    const previewScroller = editor.getPreviewScroller;

    expect(await scrollableHeight(editorScroller), 'editor must be scrollable').toBeGreaterThan(0);
    const previewScrollable = await scrollableHeight(previewScroller);
    expect(previewScrollable, 'preview must be scrollable').toBeGreaterThan(0);

    // Typing leaves the caret at the end, which pins the preview to its
    // bottom; scrolling the editor to the top clears that state first.
    await scrollToFraction(editorScroller, 0);
    await expect.poll(() => scrollTop(previewScroller)).toBeLessThan(20);

    await scrollToFraction(editorScroller, 0.5);
    await expect.poll(() => scrollTop(previewScroller)).toBeGreaterThan(0);
    const previewAtMid = await scrollTop(previewScroller);

    // Block-anchor mapping: the editor's 50% is not the preview's 50%, so
    // assert top -> mid -> bottom is monotonic and ends near the bottom.
    await scrollToFraction(editorScroller, 1);
    await expect.poll(() => scrollTop(previewScroller)).toBeGreaterThan(previewAtMid);
    expect(await scrollTop(previewScroller)).toBeGreaterThan(previewScrollable * 0.8);
  });

  test('sync scroll toggle disables and re-enables synchronization', async ({ page }) => {
    const editor = await openEditorWithScrollableBody(page);
    const editorScroller = editor.getEditorScroller;
    const previewScroller = editor.getPreviewScroller;

    await scrollToFraction(editorScroller, 0);
    await expect.poll(() => scrollTop(previewScroller)).toBeLessThan(20);
    const halfEditor = (await scrollableHeight(editorScroller)) * 0.5;

    await clickSyncToggle(editor);
    await wheelOver(page, editorScroller, halfEditor);
    await expect.poll(() => scrollTop(editorScroller)).toBeGreaterThan(0);
    expect(await scrollTop(previewScroller), 'preview must stay put while sync is off').toBeLessThan(20);

    await clickSyncToggle(editor);
    await scrollToFraction(editorScroller, 0);
    await expect.poll(() => scrollTop(editorScroller)).toBe(0);
    await wheelOver(page, editorScroller, halfEditor);
    await expect
      .poll(() => scrollTop(previewScroller), { message: 'preview should sync after re-enabling' })
      .toBeGreaterThan(50);
  });
});
