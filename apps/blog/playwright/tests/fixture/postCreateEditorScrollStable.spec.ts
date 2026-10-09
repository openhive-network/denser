import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { serveImages } from '../support/bodyImages';
import { MOBILE_VIEWPORT } from '../support/layoutShift';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { fillPostBody, gotoSubmitLoggedIn } from '../support/postCreationContext';

/**
 * Post creation — clicking a line mid-document and typing keeps the editor
 * where it is. Each keystroke re-renders the preview; with sync scroll on, a
 * preview scroll or layout change fed back into the editor would move the
 * line the author is typing on.
 *
 * Re-uses the `postCreate` fixture set; the proxied images are served locally,
 * full-width and slightly delayed, so a reloaded image would change the preview's height.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateEditorScrollStable.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

const IMAGE_DELAY_MS = 300;
const PARAGRAPH_COUNT = 40;
const IMAGE_POSITIONS = new Set([12, 26]);
const LAST_LINE = `Paragraph ${PARAGRAPH_COUNT} closes the document.`;
const TYPED_TEXT = ' typed mid-document';
// Sub-pixel rounding of scrollTop and line boxes; a jump is a line or more.
const MAX_DRIFT_PX = 3;
// Longer than the preview debounce, the scroll-sync lock and its RAF passes.
const SETTLE_MS = 1_000;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

function longBodyWithImages(): string {
  const blocks = ['# Scroll stability'];
  for (let i = 1; i <= PARAGRAPH_COUNT; i++) {
    blocks.push(i === PARAGRAPH_COUNT ? LAST_LINE : `Paragraph ${i} of a long post body.`);
    if (IMAGE_POSITIONS.has(i)) {
      blocks.push(`![photo ${i}](https://example.com/scroll-stability-${i}.png)`);
    }
  }
  return blocks.join('\n\n');
}

async function openEditorWithLongBody(page: Page): Promise<PostEditorPage> {
  await serveImages(page, { resizedDelayMs: IMAGE_DELAY_MS, fullSizeDelayMs: IMAGE_DELAY_MS });
  await gotoSubmitLoggedIn(page);
  const editor = new PostEditorPage(page);
  await editor.validateDefaultPostEditorIsLoaded();
  await fillPostBody(page, longBodyWithImages());
  await expect(editor.getPreviewContainer).toContainText(LAST_LINE);
  const previewImages = editor.getPreviewContainer.locator('img[alt^="photo"]');
  await expect(previewImages).toHaveCount(IMAGE_POSITIONS.size);
  await expect
    .poll(() => previewImages.evaluateAll((imgs: HTMLImageElement[]) => imgs.every((img) => img.complete)))
    .toBe(true);
  return editor;
}

const scrollTop = (scroller: Locator) => scroller.evaluate((el) => el.scrollTop);

// Real wheel input, as an author would scroll; it reaches the sync listener.
async function wheelEditorToMiddle(page: Page, scroller: Locator) {
  await scroller.evaluate((el) => {
    el.scrollTop = 0;
  });
  const box = await scroller.boundingBox();
  if (!box) throw new Error('editor scroller has no bounding box');
  const half = await scroller.evaluate((el) => (el.scrollHeight - el.clientHeight) / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, half);
  await expect.poll(() => scrollTop(scroller)).toBeGreaterThan(half / 2);
  await page.waitForTimeout(SETTLE_MS);
}

/** The text line under the vertical middle of the editor viewport. */
async function lineInMiddle(page: Page, scroller: Locator): Promise<Locator> {
  const index = await scroller.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    const lines = Array.from(el.querySelectorAll('.cm-content > .cm-line'));
    return lines.findIndex((line) => {
      const box = line.getBoundingClientRect();
      return (line.textContent ?? '').startsWith('Paragraph') && box.bottom > middle - 40 && box.top < middle + 40;
    });
  });
  if (index < 0) throw new Error('no paragraph line near the middle of the editor');
  return scroller.locator('.cm-content > .cm-line').nth(index);
}

async function expectClickAndTypeKeepScroll(page: Page, editor: PostEditorPage) {
  const scroller = editor.getEditorScroller;
  await wheelEditorToMiddle(page, scroller);

  const line = await lineInMiddle(page, scroller);
  const lineText = (await line.textContent()) ?? '';
  const scrollBefore = await scrollTop(scroller);
  const lineTopBefore = (await line.boundingBox())?.y;

  await line.click();
  await page.keyboard.press('End');
  await page.keyboard.type(TYPED_TEXT);
  await expect(editor.getPreviewContainer).toContainText(`${lineText}${TYPED_TEXT}`);
  await page.waitForTimeout(SETTLE_MS);

  const scrollAfter = await scrollTop(scroller);
  expect(Math.abs(scrollAfter - scrollBefore), `editor scrollTop ${scrollBefore} -> ${scrollAfter}`).toBeLessThanOrEqual(
    MAX_DRIFT_PX
  );
  const lineTopAfter = (await line.boundingBox())?.y;
  if (lineTopBefore === undefined || lineTopAfter === undefined) throw new Error('clicked line is not rendered');
  expect(Math.abs(lineTopAfter - lineTopBefore), `clicked line top ${lineTopBefore} -> ${lineTopAfter}`).toBeLessThanOrEqual(
    MAX_DRIFT_PX
  );
}

test.describe('Post creation — editor scroll stays put while typing mid-document', () => {
  test.describe('on a desktop viewport', () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test('POST-SCROLL-STABLE-01: with sync scroll on', async ({ page }) => {
      const editor = await openEditorWithLongBody(page);
      await expectClickAndTypeKeepScroll(page, editor);
    });

    test('POST-SCROLL-STABLE-02: with sync scroll off', async ({ page }) => {
      const editor = await openEditorWithLongBody(page);
      await editor.getSyncScrollContainer.hover();
      await editor.getSyncScrollToggle.click();
      await expectClickAndTypeKeepScroll(page, editor);
    });
  });

  // Below lg the preview stacks under the editor and sync scroll does not apply.
  test.describe('on a phone viewport', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test('POST-SCROLL-STABLE-03: editor stacked above the preview', async ({ page }) => {
      const editor = await openEditorWithLongBody(page);
      await editor.getEditorScroller.scrollIntoViewIfNeeded();
      await expectClickAndTypeKeepScroll(page, editor);
    });
  });
});
