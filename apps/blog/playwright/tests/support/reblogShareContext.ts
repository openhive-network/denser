import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';
import {
  POST_AUTHOR,
  POST_PERMLINK,
  POST_PATH,
  VOTER,
  gotoPostLoggedIn
} from './commentingContext';

/**
 * Shared context for §7 Reblog & Share fixture specs. Reuses the same
 * gtg/hive-hardfork-25-jump-starter-kit post as §5/§6 to keep fixture
 * recordings small.
 */

export { POST_AUTHOR, POST_PERMLINK, POST_PATH, VOTER, gotoPostLoggedIn };

/**
 * The path that SharePost receives via the `path` prop. It comes from
 * `postData.url` returned by `bridge.get_post`, which has no trailing
 * slash — distinct from `POST_PATH` (with trailing slash) used for
 * `page.goto`.
 *
 * Used by SHARE-01/02 to sanity-check that whatever URL the dialog
 * exposes contains the right post identity, without coupling to
 * `configuredBlogDomain` (which differs between local `.env.local`
 * and CI's fallback default — see public-vars.ts).
 */
export const POST_SHARE_PATH = POST_PATH.replace(/\/$/, '');

/**
 * Open the share-this-post dialog from the post footer. The footer `share-post`
 * button is the trigger; the dialog is identified by `share-post-dialog`.
 */
export async function openSharePostDialog(page: Page): Promise<void> {
  await page.getByTestId('share-post').click();
  await expect(page.getByTestId('share-post-dialog')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Assert that a URL the share dialog exposes is the absolute URL of the
 * post: a single scheme, then the post path as the URL's last segments.
 * The origin and any base path come from the configured blog domain.
 */
export function expectPostShareUrl(url: string): void {
  expect(url).toMatch(/^https?:\/\/[^/]/);
  expect(url).not.toMatch(/^https?:\/\/https?:/);
  const { pathname } = new URL(url);
  expect(pathname.endsWith(POST_SHARE_PATH)).toBe(true);
  expect(pathname).not.toContain('//');
}
