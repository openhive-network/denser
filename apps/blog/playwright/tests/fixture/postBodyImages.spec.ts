import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { serveImages } from '../support/bodyImages';
import { MOBILE_VIEWPORT, observeLayoutShiftScore, readLayoutShiftScore } from '../support/layoutShift';

/**
 * Post body images: responsive proxy candidates inline, show-then-upgrade lightbox, no layout shift.
 *
 *   01 – Inline image loads a resized proxy candidate (srcset + sizes), never the full size; the
 *        leading video's thumbnail, the LCP candidate, loads eagerly instead of the image
 *   02 – Server HTML preloads the leading video's thumbnail
 *   03 – Lightbox paints the inline image at once, then swaps in the full size
 *   04 – Hovering an image with a mouse prefetches its full size
 *   05 – Body images loading late do not shift the page
 */

test.use({ fixtureTestName: 'postDetail' });

const POST_URL = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit/';
// The post's only body image, hosted on the image host: its full size is the original URL.
const FULL_SIZE_URL = 'https://images.hive.blog/DQmQbRRrtoTFPZA9QmDRjvswPtaGuXrWXje1WHp9CeeGbV2/star_fork.png';
const RESIZED_PROXY_URL = /^https:\/\/images\.hive\.blog\/p\/[^?]+\?format=webp&mode=fit&width=\d+$/;
// Tighter than the 0.1 CLS target: the recorded post has a single body image, which shifts
// the phone viewport by ~0.07 when it loads without reserved space, and by ~0.01 with it.
const MAX_LAYOUT_SHIFT = 0.05;

// The post opens with a YouTube video, ahead of its body image.
const VIDEO_THUMBNAIL_PROXY_URL = /^https:\/\/images\.hive\.blog\/p\/[^?]+\?format=match&mode=fit&width=1536$/;

const bodyImage = (page: Page) => page.locator('#articleBody img[alt="star_fork.png"]');

async function waitForImageLoaded(image: Locator): Promise<string> {
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  return image.evaluate((img: HTMLImageElement) => img.currentSrc);
}

const decodeHtmlAttribute = (value: string) => value.replace(/&amp;/g, '&');

test.describe('Post body images (fixture-based)', () => {
  test('POST-IMG-01: inline image loads a resized proxy candidate, not the full size', async ({ page }) => {
    const requested = await serveImages(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });

    const image = bodyImage(page);
    await expect(image).toHaveAttribute('src', FULL_SIZE_URL);
    const srcset = (await image.getAttribute('srcset')) ?? '';
    expect(srcset.split(', ').map((candidate) => candidate.split(' ')[1])).toEqual(['640w', '1024w', '1536w']);
    srcset.split(', ').forEach((candidate) => expect(candidate.split(' ')[0]).toMatch(RESIZED_PROXY_URL));
    await expect(image).toHaveAttribute('sizes', /100vw$/);
    // Below the leading video, so not the LCP candidate.
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).not.toHaveAttribute('fetchpriority', /.*/);

    const thumbnail = page.locator('#articleBody .youtube-facade img');
    const preloadHref = await page.locator('head link[rel="preload"][as="image"]').getAttribute('href');
    expect(preloadHref).toMatch(VIDEO_THUMBNAIL_PROXY_URL);
    await expect(thumbnail).toHaveAttribute('src', preloadHref ?? '');
    await expect(thumbnail).toHaveAttribute('loading', 'eager');
    await expect(thumbnail).toHaveAttribute('fetchpriority', 'high');

    expect(await waitForImageLoaded(image)).toMatch(RESIZED_PROXY_URL);
    await page.waitForLoadState('networkidle');
    expect(requested).not.toContain(FULL_SIZE_URL);
  });

  test('POST-IMG-02: server HTML preloads the leading video thumbnail, not the body image', async ({ request }) => {
    const html = await (await request.get(POST_URL)).text();
    const preloads = [...html.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(([link]) => link);
    expect(preloads).toHaveLength(1);
    const [preload] = preloads;
    const preloadHref = decodeHtmlAttribute(preload.match(/ href="([^"]+)"/)?.[1] ?? '');
    expect(preloadHref).toMatch(VIDEO_THUMBNAIL_PROXY_URL);
    expect(preload).toContain('fetchPriority="high"');
    expect(preload).not.toContain('imageSrcSet');
    expect(html.indexOf(preload)).toBeLessThan(html.indexOf('id="articleBody"'));
    expect(html).not.toContain('fetchpriority="high"');
  });

  test('POST-IMG-03: lightbox paints the inline image at once, then swaps in the full size', async ({ page }) => {
    // Hold the full size back long enough to see what the lightbox shows without it.
    await serveImages(page, { fullSizeDelayMs: 3000 });
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    const image = bodyImage(page);
    const inlineSrc = await waitForImageLoaded(image);

    const fullSizeRequest = page.waitForRequest(FULL_SIZE_URL);
    await image.click();

    const shownSlideImage = page.locator('.yarl__slide_current img.yarl__slide_image:not([style*="hidden"])');
    await expect(shownSlideImage).toHaveAttribute('src', inlineSrc, { timeout: 1000 });
    expect(await shownSlideImage.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.locator('.yarl__slide_current .yarl__slide_loading')).toHaveCount(0);

    await fullSizeRequest;
    await expect(shownSlideImage).toHaveAttribute('src', FULL_SIZE_URL, { timeout: 10_000 });
  });

  test('POST-IMG-04: hovering an image with a mouse prefetches its full size', async ({ page }) => {
    const requested = await serveImages(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    const image = bodyImage(page);
    await waitForImageLoaded(image);
    expect(requested).not.toContain(FULL_SIZE_URL);

    const fullSizeRequest = page.waitForRequest(FULL_SIZE_URL);
    await image.hover();
    await fullSizeRequest;
  });

  test.describe('on a phone viewport', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test('POST-IMG-05: body images loading late do not shift the page', async ({ page }) => {
      await serveImages(page, { resizedDelayMs: 1500 });
      await observeLayoutShiftScore(page);
      await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
      const image = bodyImage(page);
      await image.scrollIntoViewIfNeeded();
      await waitForImageLoaded(image);
      await page.waitForLoadState('networkidle');

      expect(await readLayoutShiftScore(page)).toBeLessThan(MAX_LAYOUT_SHIFT);
    });
  });
});
