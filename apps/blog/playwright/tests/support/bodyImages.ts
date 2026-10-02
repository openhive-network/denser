import type { Page } from '@playwright/test';
import { IMAGES_ORIGIN } from './cardImagePreload';

export interface ServedImageOptions {
  /** pixel size of every image served */
  width?: number;
  height?: number;
  /** response delay for resized (`/p/…?width=`) proxy URLs */
  resizedDelayMs?: number;
  /** response delay for every other image-host URL (full size) */
  fullSizeDelayMs?: number;
}

const isResizedProxyUrl = (url: string) => /\/p\/[^?]+\?.*\bwidth=\d+/.test(url);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serves every image-host request an image of the given pixel size and records the requested
 * URLs, in order. Call before navigating; the returned array fills as the page loads.
 */
export async function serveImages(
  page: Page,
  { width = 1600, height = 900, resizedDelayMs = 0, fullSizeDelayMs = 0 }: ServedImageOptions = {}
): Promise<string[]> {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e31337"/></svg>`;
  const requested: string[] = [];
  await page.route(`${IMAGES_ORIGIN}/**`, async (route) => {
    const url = route.request().url();
    requested.push(url);
    await delay(isResizedProxyUrl(url) ? resizedDelayMs : fullSizeDelayMs);
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body });
  });
  return requested;
}
