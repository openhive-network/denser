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
 * The blog domain that share-post-dialog plugs into the URL/markdown
 * snippets. Note: this is the value of `configuredBlogDomain`
 * (`packages/ui/config/public-vars.ts`) — it already includes the
 * `https://` prefix, while `share-post-dialog.tsx` *also* prepends
 * `https://` when building the share URL. The result is a literal
 * `https://https://blog.openhive.network<path>` snippet on the
 * clipboard.
 *
 * That double-prefix is a long-standing bug in the source (see issue
 * tracker before "fixing"), but our test must verify what the code
 * actually produces today — so we keep the bug in the expected
 * snippet. If/when share-post-dialog stops re-adding `https://`, this
 * helper needs to be updated in the same MR.
 */
export const BLOG_DOMAIN_RAW = 'https://blog.openhive.network';

/**
 * The path that SharePost receives via the `path` prop. It comes from
 * `postData.url` returned by `bridge.get_post`, which has no trailing
 * slash — distinct from `POST_PATH` (with trailing slash) used for
 * `page.goto`.
 */
export const POST_SHARE_PATH = POST_PATH.replace(/\/$/, '');

/** The full clipboard text the "URL to this post" field exposes. */
export const expectedShareUrl = (path = POST_SHARE_PATH): string =>
  `https://${BLOG_DOMAIN_RAW}${path}`;

/** The clipboard text the "Markdown code" field exposes. */
export const expectedShareMarkdown = (
  title: string,
  path = POST_SHARE_PATH
): string => `[${title}](https://${BLOG_DOMAIN_RAW}${path})`;

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
