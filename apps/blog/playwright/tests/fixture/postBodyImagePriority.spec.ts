import { test, expect } from '../support/fixture-proxy-test';
import { serveImages } from '../support/bodyImages';

/**
 * Post body image loading priority, on a post with several images ahead of a YouTube video.
 *
 *   01 – Server HTML: the first body image loads eagerly at high priority, every later one lazily
 *   02 – Server HTML preloads the first body image with the image's own srcset/sizes
 *   03 – The video thumbnail below the images stays lazy
 */

test.use({ fixtureTestName: 'ssrChecks' });

const POST_URL = '/test/@guest4test1/test-ako-post';

// Lighthouse's mobile emulation: 412 CSS px at DPR 1.75 leaves a ~650 device-px content column.
const LIGHTHOUSE_PHONE = { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true };

const decodeHtmlAttribute = (value: string) => value.replace(/&amp;/g, '&');

function getBodyImageTags(html: string): string[] {
  const body = html.slice(html.indexOf('id="articleBody"'));
  return [...body.matchAll(/<img [^>]*>/g)].map(([tag]) => tag).filter((tag) => tag.includes('decoding="async"'));
}

test.describe('Post body image priority (fixture-based)', () => {
  test('POST-IMG-PRIO-01: first body image loads eagerly at high priority, later ones lazily', async ({ request }) => {
    const html = await (await request.get(POST_URL)).text();
    const [first, ...later] = getBodyImageTags(html);

    expect(later.length).toBeGreaterThan(0);
    expect(first).toContain('loading="eager" fetchpriority="high"');
    later.forEach((tag) => {
      expect(tag).toContain('loading="lazy"');
      expect(tag).not.toContain('fetchpriority');
    });
  });

  test('POST-IMG-PRIO-02: server HTML preloads the first body image with its srcset and sizes', async ({ request }) => {
    const html = await (await request.get(POST_URL)).text();
    const [first] = getBodyImageTags(html);
    const src = first.match(/ src="([^"]+)"/)?.[1] ?? '';
    const srcset = first.match(/ srcset="([^"]+)"/)?.[1];
    expect(srcset).toBeTruthy();
    const sizes = first.match(/ sizes="([^"]+)"/)?.[1];

    const preloads = [...html.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(([link]) => link);
    expect(preloads).toHaveLength(1);
    const [preload] = preloads;
    expect(decodeHtmlAttribute(preload.match(/ href="([^"]+)"/)?.[1] ?? '')).toBe(decodeHtmlAttribute(src));
    expect(decodeHtmlAttribute(preload.match(/imageSrcSet="([^"]+)"/)?.[1] ?? '')).toBe(decodeHtmlAttribute(srcset ?? ''));
    expect(preload).toContain(`imageSizes="${sizes}"`);
    expect(preload).toContain('fetchPriority="high"');
    expect(html.indexOf(preload)).toBeLessThan(html.indexOf('id="articleBody"'));
  });

  test('POST-IMG-PRIO-03: the video thumbnail below the body images stays lazy', async ({ page }) => {
    await serveImages(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });

    const thumbnail = page.locator('#articleBody .youtube-facade img').first();
    await expect(thumbnail).toHaveAttribute('loading', 'lazy');
    await expect(thumbnail).not.toHaveAttribute('fetchpriority', /.*/);
  });

  test.describe('on a Lighthouse-sized phone', () => {
    test.use(LIGHTHOUSE_PHONE);

    test('POST-IMG-PRIO-04: the first body image loads the 768 px candidate, once', async ({ page }) => {
      const requested = await serveImages(page);
      await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });

      const first = page.locator('#articleBody img[decoding="async"]').first();
      await expect(first).toHaveAttribute('loading', 'eager');
      await expect(first).toHaveAttribute('fetchpriority', 'high');
      await expect.poll(() => first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const currentSrc = await first.evaluate((img: HTMLImageElement) => img.currentSrc);
      expect(currentSrc).toMatch(/[?&]width=768$/);

      // The preload and the eager image have both resolved by `load`.
      await page.waitForLoadState('load');
      const imagePath = currentSrc.split('?')[0];
      expect(requested.filter((url) => url.split('?')[0] === imagePath)).toEqual([currentSrc]);
      expect(new Set(requested).size).toBe(requested.length);
    });
  });
});
