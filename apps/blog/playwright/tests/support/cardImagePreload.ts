import { expect, type Page, type Request } from '@playwright/test';

// playwright.fixture.config.ts sets REACT_APP_IMAGES_ENDPOINT to https://images.hive.blog/.
export const IMAGES_ORIGIN = 'https://images.hive.blog';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const decodeHtmlAttribute = (value: string) => value.replace(/&amp;/g, '&');

function getImagePreloads(html: string): string[] {
  return [...html.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(([link]) => link);
}

function getFirstCardImageSrcSet(html: string): string | undefined {
  return html.match(/<img srcSet="([^"]+)" alt="Post image"/)?.[1];
}

/** Decoded URL of the first feed card image in server HTML, or '' when no card has one. */
export function getFirstCardImageUrl(html: string): string {
  return decodeHtmlAttribute(getFirstCardImageSrcSet(html) ?? '');
}

/**
 * Asserts the server HTML carries exactly one image preload, and that it matches the first
 * card's `<img srcSet>` byte for byte (otherwise the browser fetches the image twice).
 */
export function expectOnlyFirstCardImagePreloaded(html: string): void {
  const imagePreloads = getImagePreloads(html);
  expect(imagePreloads).toHaveLength(1);
  const [preload] = imagePreloads;
  const firstCardSrcSet = getFirstCardImageSrcSet(html);
  expect(firstCardSrcSet).toMatch(new RegExp(`^${IMAGES_ORIGIN}/`));
  expect(preload).toContain(`imageSrcSet="${firstCardSrcSet}"`);
  expect(preload).toContain('fetchPriority="high"');
  expect(preload).not.toContain('imageSizes');
  expect(html.indexOf(preload)).toBeLessThan(html.indexOf('data-testid="post-list-item"'));
}

/**
 * Serves every image-host request a 1x1 PNG and collects the requests made for `imageUrl`.
 * Call before navigating; the returned array fills as the page loads.
 */
export async function recordImageRequests(page: Page, imageUrl: string): Promise<Request[]> {
  await page.route(`${IMAGES_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: ONE_PIXEL_PNG })
  );
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url() === imageUrl) requests.push(request);
  });
  return requests;
}
