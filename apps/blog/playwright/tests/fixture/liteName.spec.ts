import type { Page, Route } from '@playwright/test';
import { openReplyEditor } from '../support/commentingContext';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * The guest's lite name dialog checks names with the gateway (`GET /names/{name}/availability`).
 *
 *   LITE-NAME-01 – the first suggestion is one the gateway says is free (taken ones are skipped), offered enabled
 *   LITE-NAME-02 – typing a lite account's or a Hive account's name says so and disables Confirm; a free one enables it
 *   LITE-NAME-03 – a gateway that cannot answer says so and leaves Confirm enabled
 *   LITE-NAME-04 – a reply refused with `name_taken` reopens the dialog on that name, as taken
 *
 * The page is the `litePost` recording; the gateway is answered in the browser.
 */

test.use({ fixtureTestName: 'litePost' });

const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const LITE_TAKEN = 'lite-smoke-1016';
const L1_TAKEN = 'test-gateway-1';
const FREE = 'fresh-guest-501';

const INFO = {
  enabled: true,
  gate_account: 'test-gateway-1',
  chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' }
};
const HEALTH = {
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: { default: { reply: { ready: true, available_in_s: 0 } } }
};

const AVAILABILITY = /\/api\/lite-gateway\/names\/([^/]+)\/availability$/;

const availability = (name: string, takenSuggestions: Set<string>) => {
  const liteTaken = name === LITE_TAKEN || takenSuggestions.has(name);
  const l1Taken = name === L1_TAKEN;
  return { name, available: !liteTaken && !l1Taken, lite_grammar_ok: true, l1_grammar_ok: true, lite_taken: liteTaken, l1_taken: l1Taken };
};

/**
 * Answers the relay's /info and /health, and the availability check: the recorded lite and L1
 * names are taken, and so are the first `takenFirst` other names asked; `down` answers 503 instead.
 */
async function mockGateway(page: Page, { takenFirst = 0, down = false } = {}) {
  const asked: string[] = [];
  const takenSuggestions = new Set<string>();
  await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
  await page.route('**/api/lite-reply', (route) => route.fulfill({ json: INFO }));
  await page.route(AVAILABILITY, (route: Route) => {
    const name = decodeURIComponent(AVAILABILITY.exec(route.request().url())?.[1] ?? '');
    asked.push(name);
    if (down) return route.fulfill({ status: 503, json: { ok: false, code: 'relay_unavailable', message: 'lite gateway unreachable' } });
    if (name !== LITE_TAKEN && name !== L1_TAKEN && takenSuggestions.size < takenFirst) takenSuggestions.add(name);
    return route.fulfill({ json: availability(name, takenSuggestions) });
  });
  return asked;
}

async function openNameDialog(page: Page) {
  const postPage = new PostPage(page);
  await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
  await postPage.waitForPostHydration();
  const reply = page.getByTestId('comment-reply').first();
  await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
  const editor = page.getByTestId('lite-reply-editor');
  await openReplyEditor(reply, editor);
  await editor.locator('.cm-content').fill(`Guest reply ${Date.now()}`);
  await page.getByTestId('lite-reply-post').click();
  await expect(page.getByTestId('lite-name-dialog')).toBeVisible();
}

test.describe('Lite name dialog checks availability (mocked gateway)', () => {
  test('LITE-NAME-01: the first suggestion is one the gateway says is free', async ({ page }) => {
    const asked = await mockGateway(page, { takenFirst: 2 });
    await openNameDialog(page);

    const status = page.getByTestId('lite-name-status');
    await expect(status).toHaveAttribute('data-state', 'available');
    await expect(page.getByTestId('lite-name-confirm')).toBeEnabled();
    // Two taken suggestions were skipped (a dev build's strict mode may ask a first name twice).
    expect(asked.length).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId('lite-name-input')).toHaveValue(asked[asked.length - 1]);
  });

  test('LITE-NAME-02: a lite or Hive account name is taken and disables Confirm; a free one enables it', async ({ page }) => {
    await mockGateway(page);
    await openNameDialog(page);
    const input = page.getByTestId('lite-name-input');
    const status = page.getByTestId('lite-name-status');
    const confirm = page.getByTestId('lite-name-confirm');

    await input.fill(LITE_TAKEN);
    await expect(status).toHaveAttribute('data-state', 'taken_lite');
    await expect(status).toHaveText('This name belongs to another lite account.');
    await expect(confirm).toBeDisabled();

    await input.fill(L1_TAKEN);
    await expect(status).toHaveAttribute('data-state', 'taken_l1');
    await expect(status).toHaveText('This name belongs to a Hive account.');
    await expect(confirm).toBeDisabled();

    await input.fill('ab');
    await expect(status).toHaveAttribute('data-state', 'invalid');
    await expect(confirm).toBeDisabled();

    await input.fill(FREE);
    await expect(status).toHaveAttribute('data-state', 'available');
    await expect(confirm).toBeEnabled();
  });

  test('LITE-NAME-03: an unreachable gateway is named and Confirm stays enabled', async ({ page }) => {
    await mockGateway(page, { down: true });
    await openNameDialog(page);

    await expect(page.getByTestId('lite-name-status')).toHaveAttribute('data-state', 'check_failed');
    await expect(page.getByTestId('lite-name-confirm')).toBeEnabled();
  });

  test('LITE-NAME-04: a reply refused for a taken name reopens the dialog on that name', async ({ page }) => {
    await mockGateway(page);
    await page.route('**/api/lite-reply', (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ json: INFO });
      return route.fulfill({ status: 409, json: { ok: false, code: 'name_taken', message: 'name taken' } });
    });
    await openNameDialog(page);
    const input = page.getByTestId('lite-name-input');
    await input.fill(FREE);
    await expect(page.getByTestId('lite-name-status')).toHaveAttribute('data-state', 'available');
    await page.getByTestId('lite-name-confirm').click();

    await expect(page.getByTestId('lite-name-dialog')).toBeVisible();
    await expect(input).toHaveValue(FREE);
    await expect(page.getByTestId('lite-name-status')).toHaveAttribute('data-state', 'taken');
    await expect(page.getByTestId('lite-name-confirm')).toBeDisabled();
    await expect(page.getByTestId('lite-reply-editor')).toBeVisible();
  });
});
