import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { serveImages } from '../support/bodyImages';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { fillPostBody, gotoSubmitLoggedIn } from '../support/postCreationContext';

/**
 * Post creation — editor/preview sync scroll (use-scroll-sync.ts).
 * Offline port of e2e/syncScroll.spec.ts, which needs a live login; the
 * live spec stays as an optional smoke test.
 *
 * Re-uses the `postCreate` fixture set: only the /submit.html page load
 * hits RPCs, scrolling is client-side. Body images are served locally at a
 * fixed size, so the preview's heights are deterministic.
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

const IMAGE_COUNT = 8;
const IMAGE_SIZE = { width: 800, height: 600 } as const;
const FILLER_PARAGRAPH_COUNT = 30;
const IMAGE_BODY_LAST_LINE = `Filler paragraph ${FILLER_PARAGRAPH_COUNT}.`;
// Each of these paragraphs sits directly below an image.
const SYNCED_PARAGRAPHS = [2, 5, 8];
// A line or two of slack for sub-pixel layout; a wrong anchor is off by an image height.
const ALIGN_TOLERANCE_PX = 30;

const imageParagraphText = (n: number) => `Image paragraph ${n} of the photo post.`;

function imageHeavyBody(): string {
  const blocks = ['# Photo post'];
  for (let i = 1; i <= IMAGE_COUNT; i++) {
    blocks.push(imageParagraphText(i), `![photo ${i}](https://example.com/sync-scroll-${i}.png)`);
  }
  for (let i = 1; i <= FILLER_PARAGRAPH_COUNT; i++) blocks.push(`Filler paragraph ${i}.`);
  return blocks.join('\n\n');
}

async function openEditorWithImageHeavyBody(page: Page) {
  await serveImages(page, IMAGE_SIZE);
  await gotoSubmitLoggedIn(page);
  const editor = new PostEditorPage(page);
  await editor.validateDefaultPostEditorIsLoaded();
  await fillPostBody(page, imageHeavyBody());
  await expect(editor.getPreviewContainer).toContainText(IMAGE_BODY_LAST_LINE);
  const previewImages = editor.getPreviewContainer.locator('img[alt^="photo"]');
  await expect(previewImages).toHaveCount(IMAGE_COUNT);
  await expect
    .poll(() =>
      previewImages.evaluateAll((imgs: HTMLImageElement[]) => imgs.every((img) => img.complete && img.naturalHeight > 0))
    )
    .toBe(true);
  return editor;
}

/** Scrolls the editor so the line with exactly `text` is at the top of its viewport. */
async function scrollEditorLineToTop(scroller: Locator, text: string) {
  await scroller.evaluate((el, lineText) => {
    const line = Array.from(el.querySelectorAll('.cm-content > .cm-line')).find((l) => l.textContent === lineText);
    if (!line) throw new Error(`no editor line "${lineText}"`);
    el.scrollTop += line.getBoundingClientRect().top - el.getBoundingClientRect().top;
    el.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, text);
}

/** Distance from the preview viewport's top to the paragraph with exactly `text`. */
async function previewParagraphOffset(scroller: Locator, text: string): Promise<number> {
  return scroller.evaluate((el, paragraphText) => {
    const paragraph = Array.from(el.querySelectorAll('p')).find((p) => p.textContent?.trim() === paragraphText);
    if (!paragraph) throw new Error(`no preview paragraph "${paragraphText}"`);
    return paragraph.getBoundingClientRect().top - el.getBoundingClientRect().top;
  }, text);
}

const CAPTIONED_IMAGE_ALT = 'captioned photo';
const CAPTIONED_IMAGE_LINE = `![${CAPTIONED_IMAGE_ALT}](https://example.com/sync-scroll-captioned.png)`;
const CAPTION = 'Caption under the photo';
// Image blocks whose source has more lines than the image alone, so mapping
// the whole block proportionally misplaces the image inside it.
const CAPTIONED_IMAGE_BLOCKS = {
  'centered with a caption': `<center>\n${CAPTIONED_IMAGE_LINE}\n<sub>${CAPTION}</sub>\n</center>`,
  'with a caption on the next line': `${CAPTIONED_IMAGE_LINE}\n${CAPTION}`
};
const LEAD_PARAGRAPH_COUNT = 6;

function captionedImageBody(imageBlock: string): string {
  const blocks = ['# Photo post'];
  for (let i = 1; i <= LEAD_PARAGRAPH_COUNT; i++) blocks.push(`Lead paragraph ${i}.`);
  blocks.push(imageBlock);
  for (let i = 1; i <= FILLER_PARAGRAPH_COUNT; i++) blocks.push(`Filler paragraph ${i}.`);
  return blocks.join('\n\n');
}

async function openEditorWithCaptionedImage(page: Page, imageBlock: string) {
  await serveImages(page, IMAGE_SIZE);
  await gotoSubmitLoggedIn(page);
  const editor = new PostEditorPage(page);
  await editor.validateDefaultPostEditorIsLoaded();
  await fillPostBody(page, captionedImageBody(imageBlock));
  await expect(editor.getPreviewContainer).toContainText(IMAGE_BODY_LAST_LINE);
  const image = editor.getPreviewContainer.locator(`img[alt="${CAPTIONED_IMAGE_ALT}"]`);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalHeight > 0)).toBe(true);
  return editor;
}

/** Scrolls the editor so its viewport top is `fraction` of the way down the line reading `text`, indent aside. */
async function scrollEditorIntoLine(scroller: Locator, text: string, fraction: number) {
  await scroller.evaluate(
    (el, [lineText, f]) => {
      const line = Array.from(el.querySelectorAll<HTMLElement>('.cm-content > .cm-line')).find(
        (l) => l.textContent?.trim() === lineText
      );
      if (!line) throw new Error(`no editor line "${lineText}"`);
      el.scrollTop += line.getBoundingClientRect().top - el.getBoundingClientRect().top + line.offsetHeight * f;
      el.dispatchEvent(new Event('scroll', { bubbles: true }));
    },
    [text, fraction] as const
  );
}

/** Distance from the preview viewport's top to the point `fraction` of the way down the image with `alt`. */
async function previewImageDrift(scroller: Locator, alt: string, fraction: number): Promise<number> {
  return scroller.evaluate(
    (el, [imageAlt, f]) => {
      const image = el.querySelector(`img[alt="${imageAlt}"]`);
      if (!image) throw new Error(`no preview image "${imageAlt}"`);
      const box = image.getBoundingClientRect();
      return Math.abs(box.top + box.height * f - el.getBoundingClientRect().top);
    },
    [alt, fraction] as const
  );
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

test.describe('Post creation — sync scroll with images (§2.1)', () => {
  test('POST-SYNC-SCROLL-IMG-01: preview shows the paragraph at the editor top when images are loaded', async ({
    page
  }) => {
    const editor = await openEditorWithImageHeavyBody(page);
    const editorScroller = editor.getEditorScroller;
    const previewScroller = editor.getPreviewScroller;

    for (const n of SYNCED_PARAGRAPHS) {
      const text = imageParagraphText(n);
      await scrollEditorLineToTop(editorScroller, text);
      await expect
        .poll(async () => Math.abs(await previewParagraphOffset(previewScroller, text)), {
          message: `preview should show "${text}" at its top`
        })
        .toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
    }
  });

  for (const [layout, imageBlock] of Object.entries(CAPTIONED_IMAGE_BLOCKS)) {
    test(`POST-SYNC-SCROLL-IMG-02: preview tracks the editor inside an image ${layout}`, async ({ page }) => {
      const editor = await openEditorWithCaptionedImage(page, imageBlock);
      const midpoint = 0.5;

      await scrollEditorIntoLine(editor.getEditorScroller, CAPTIONED_IMAGE_LINE, midpoint);
      await expect
        .poll(() => previewImageDrift(editor.getPreviewScroller, CAPTIONED_IMAGE_ALT, midpoint), {
          message: "preview top should be at the image's midpoint"
        })
        .toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
    });
  }
});
