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
 * Open the share-this-post dialog from the post footer. The footer Link2
 * icon is the trigger; the dialog is identified by `share-post-dialog`.
 */
export async function openSharePostDialog(page: Page): Promise<void> {
  await page.getByTestId('share-post').click();
  await expect(page.getByTestId('share-post-dialog')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
}
