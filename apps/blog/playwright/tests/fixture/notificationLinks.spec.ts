import { test, expect } from '../support/fixture-proxy-test';
import { NotificationsPage } from '../support/pages/notificationsPage';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';

/**
 * Notification links lead to their target, also under a base path.
 *
 * A post notification links to `/@author/permlink`, which the `fallback` rewrite
 * sends to /api/resolve-post; that route redirects to the post's canonical
 * `/category/@author/permlink`. A follow notification links to the account page.
 *
 * Tagged @basepath: .aidev/run-fixture-e2e.sh runs it a second time against a
 * build served under FIXTURE_BASE_PATH, where the redirect has to keep the base
 * path or the user lands outside the app.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright \
 *            --config=playwright.fixture.config.ts notificationLinks
 * Replay:  pnpm --filter @hive/blog test:fixture -- notificationLinks
 */

test.use({ fixtureTestName: 'notificationLinks' });

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const OWNER = 'gtg';
const POST_LINK = /\/@([a-z0-9.-]+)\/([^/?#]+)$/;
const ACCOUNT_LINK = /\/@([a-z0-9.-]+)$/;

/** A site path under the base path the server is served at. */
function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The first notification message link whose path matches `pattern`. */
async function notificationLink(notifications: NotificationsPage, pattern: RegExp) {
  const links = notifications.notificationItems.locator(
    'a:has([data-testid="notification-account-and-message"])'
  );
  await expect(links.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  const hrefs = await links.evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href') ?? ''));
  const index = hrefs.findIndex((href) => pattern.test(href));
  expect(index, `a notification linking to ${pattern} among ${hrefs.join(', ')}`).toBeGreaterThanOrEqual(0);
  const match = pattern.exec(hrefs[index]) ?? [];
  return { link: links.nth(index), match };
}

test.describe('Notification links', { tag: '@basepath' }, () => {
  test('NOTIF-LINK-01 — a post notification opens the post under the base path', async ({ page }) => {
    await page.goto(withBase(`/@${OWNER}/notifications`));
    const { link, match } = await notificationLink(new NotificationsPage(page), POST_LINK);
    const [, author, permlink] = match;

    await link.click();

    const origin = new URL(page.url()).origin;
    const postUrl = new RegExp(
      `^${escapeRegExp(`${origin}${BASE_PATH}`)}/[a-z0-9][a-z0-9-]*/@${escapeRegExp(author)}/${escapeRegExp(permlink)}$`
    );
    await expect(page).toHaveURL(postUrl, { timeout: TIMEOUTS.HYDRATION });
    await expect(new PostPage(page).articleBody).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });
  });

  test('NOTIF-LINK-02 — a follow notification opens the account page under the base path', async ({
    page
  }) => {
    await page.goto(withBase(`/@${OWNER}/notifications`));
    const { link, match } = await notificationLink(new NotificationsPage(page), ACCOUNT_LINK);
    const [, account] = match;

    await link.click();

    const origin = new URL(page.url()).origin;
    await expect(page).toHaveURL(`${origin}${withBase(`/@${account}`)}`, { timeout: TIMEOUTS.HYDRATION });
  });
});
