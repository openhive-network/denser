import type { Locator, Page, Route } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { configureChat } from '../support/chatSettings';
import { FEED_ROUTES, gotoLoggedIn } from '../support/postDisplayContext';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * The inline "Couldn't load more posts" error at the end of a feed whose next page fails: earlier
 * posts stay, no "Background updating…" shows under the error, and its Retry and Check Node Status
 * controls stay clear of the fixed chat button once the feed is scrolled to its end.
 *
 * The next page is failed in the browser: every ranked-posts read that continues from a post
 * (JSON-RPC `start_author`, Hivemind REST `start-author`) is aborted, on every node the client
 * fails over to. The chat button is Rocket.Chat's, shown to a strictly signed-in user with the
 * OpenHive chat consent, as in chatWidget.spec.ts.
 *
 * Fixtures: reuses `loggedInHomeFeeds` (first page of /trending for the signed-in observer).
 * Replay:  pnpm --filter @hive/blog test:fixture -- loadMoreError
 */

const ROCKET_CHAT = 'https://rocket.chat.test';
const EN = enBlog;
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 375, height: 667 }
];
// React Query retries a failed page three times with backoff (1 s, 2 s, 4 s) before showing the error.
const LOAD_MORE_ERROR_TIMEOUT_MS = 30_000;

test.use({
  fixtureTestName: 'loggedInHomeFeeds',
  bypassCSP: true,
  authenticatedUser: { strict: true, authenticateOnBackend: true, oauthConsent: { openhive_chat: true } }
});

const isNextPageRead = (route: Route): boolean => {
  const request = route.request();
  if (/[?&]start-author=[^&]/.test(request.url())) return true;
  const body = request.postData() ?? '';
  return body.includes('get_ranked_posts') && /"start_author":"[^"]/.test(body);
};

async function failNextPages(page: Page): Promise<void> {
  await page.route('**/*', (route) => (isNextPageRead(route) ? route.abort() : route.fallback()));
}

/** Whether two boxes share any area */
const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function expectClearOf(control: Locator, chatButton: Locator): Promise<void> {
  const controlBox = await control.boundingBox();
  const chatBox = await chatButton.boundingBox();
  expect(controlBox).not.toBeNull();
  expect(chatBox).not.toBeNull();
  if (!controlBox || !chatBox) return;
  expect(overlaps(controlBox, chatBox)).toBe(false);
}

for (const viewport of VIEWPORTS) {
  test(`LOAD-MORE-${viewport.width}: a failed next page shows only the error, its controls clear of the chat button (${viewport.name})`, async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await configureChat(page, { OPENHIVE_CHAT_URI: ROCKET_CHAT });
    await page.route(`${ROCKET_CHAT}/**`, (route) => route.fulfill({ contentType: 'text/html', body: '' }));
    await failNextPages(page);

    const homePage = new HomePage(page);
    await gotoLoggedIn(page, FEED_ROUTES.trending);
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    const chatButton = page.getByRole('button', { name: EN.chat_widget.open_widget });
    await expect(chatButton).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    const loadMoreError = page.getByTestId('load-more-error');
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(loadMoreError).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: LOAD_MORE_ERROR_TIMEOUT_MS });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeAttached();
    await expect(page.getByText(EN.user_profile.background_updating)).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const retry = loadMoreError.getByRole('button', { name: EN.user_profile.load_more_retry });
    const nodeStatus = loadMoreError.getByRole('link', { name: EN.user_profile.check_node_status });
    await expect(retry).toBeInViewport({ ratio: 1 });
    await expect(nodeStatus).toBeInViewport({ ratio: 1 });
    await expectClearOf(retry, chatButton);
    await expectClearOf(nodeStatus, chatButton);
  });
}
