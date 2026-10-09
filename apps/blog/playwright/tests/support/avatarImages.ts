import type { Page } from '@playwright/test';
import { IMAGES_ORIGIN } from './cardImagePreload';

// getDefaultImageUrl() (packages/ui/lib/avatar-utils.ts) under the fixture config's images endpoint.
export const DEFAULT_AVATAR_URL = `${IMAGES_ORIGIN}/DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4`;

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Answers every user avatar request (`/u/<user>/avatar/…`) with a 404 and every other image-host
 * request with a 1x1 PNG. Call before navigating.
 */
export async function failAvatarRequests(page: Page): Promise<void> {
  await page.route(`${IMAGES_ORIGIN}/**`, (route) =>
    /\/u\/[^/]+\/avatar(\/|$)/.test(new URL(route.request().url()).pathname)
      ? route.fulfill({ status: 404, body: '' })
      : route.fulfill({ status: 200, contentType: 'image/png', body: ONE_PIXEL_PNG })
  );
}
