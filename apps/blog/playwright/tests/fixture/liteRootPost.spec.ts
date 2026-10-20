import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';

/**
 * A guest writes a root post through a real lite gateway: the submit page offers the guest
 * editor, the name dialog creates the identity, the gateway posts it (200) or queues it (202).
 *
 *   LITE-ROOT-01 – a guest root post lands on its page, or waits in the queue and then lands
 *   LITE-ROOT-02 – while the root lane is busy, a post shows the queue panel and Cancel keeps the draft
 *
 * Needs a gateway, so it runs only on the dev stack started with DENSER_SERVER_LITE_GATEWAY_URL
 * (the test namespace on steem-16: https://steem-16.syncad.com/lite-gateway-api), and
 * .aidev/dev-stack-spec.sh hands that variable to Playwright. The fixture suite has no gateway: it
 * skips. Each test posts as a fresh identity (the gateway's quota is per identity and day). The
 * post page itself is not rendered — its reads are not in the recording — only its address is
 * checked.
 *
 *   DENSER_SERVER_LITE_GATEWAY_URL=https://steem-16.syncad.com/lite-gateway-api \
 *     .aidev/dev-stack-spec.sh playwright/tests/fixture/liteRootPost.spec.ts --retries=0
 */

test.use({ fixtureTestName: 'litePost' });

const CATEGORY = 'lite-test';
// A queued post goes out once hived lets a gate post a root post again (5 minutes per account).
const QUEUE_WAIT_MS = 7 * 60_000;

const startGuestPost = async (page: Page, title: string) => {
  const editor = new PostEditorPage(page);
  await page.goto('/submit.html');
  await page.getByTestId('lite-post-start').click();
  const name = await page.getByTestId('lite-name-input').inputValue();
  await page.getByTestId('lite-name-confirm').click();
  await expect(page.getByTestId('lite-post-form')).toBeVisible();
  await editor.getPostTitleInput.fill(title);
  await editor.getEditorContentTextarea.fill(`Posted by the denser lite root post spec at ${new Date().toISOString()}.`);
  await page.getByTestId('lite-post-tags').fill(CATEGORY);
  return name;
};

test.describe('Guest root post through the lite gateway (dev stack)', () => {
  test.skip(
    !process.env.DENSER_SERVER_LITE_GATEWAY_URL,
    'host-environment precondition: DENSER_SERVER_LITE_GATEWAY_URL names no lite gateway (dev stack with a gateway only)'
  );

  test.beforeEach(async ({ page }) => {
    // The landing page's reads are not recorded; answer its navigation (and the router's RSC
    // fetch of it, `?pending=1&_rsc=…`) without the app.
    await page.route(new RegExp(`/${CATEGORY}/@[^/]+/[^/?]+\\?pending=1(&|$)`), (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>landed</body></html>' })
    );
  });

  test('LITE-ROOT-01: a guest root post lands on its page under the lite name', async ({ page }) => {
    test.setTimeout(QUEUE_WAIT_MS + 60_000);
    const name = await startGuestPost(page, `Lite root post spec ${Date.now()}`);
    await page.getByTestId('submit-post-button').click();

    const landed = new RegExp(`/${CATEGORY}/@(did:lite:${name}|[a-z0-9.-]+)/[a-z0-9-]+\\?pending=1$`);
    await expect(page).toHaveURL(landed, { timeout: QUEUE_WAIT_MS });
  });

  test('LITE-ROOT-02: a busy root lane queues the post, and Cancel keeps the draft', async ({ page, request }) => {
    const health = await (await request.get('/api/lite-reply/health')).json();
    test.skip(health?.pools?.default?.root?.ready === true, 'the root lane is free: a post would not queue');

    const title = `Lite queued post spec ${Date.now()}`;
    await startGuestPost(page, title);
    await page.getByTestId('submit-post-button').click();

    const panel = page.getByTestId('lite-queue-status');
    await expect(panel).toHaveAttribute('data-status', 'queued');
    await expect(page.getByTestId('lite-queue-countdown')).toBeVisible();
    await page.getByTestId('lite-queue-cancel').click();

    await expect(page.getByTestId('lite-post-form')).toBeVisible();
    await expect(new PostEditorPage(page).getPostTitleInput).toHaveValue(title);
  });
});
