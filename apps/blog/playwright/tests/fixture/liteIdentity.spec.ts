import type { Page, Request } from '@playwright/test';
import { openReplyEditor } from '../support/commentingContext';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * The header shows the lite account this browser holds, for a reader who is not signed in.
 *
 *   LITE-IDENTITY-01 – no indicator before the browser holds a lite account; after a guest reply it
 *                      shows the name without a reload, and its menu links the lite profile
 *   LITE-IDENTITY-02 – Forget (confirmed) removes the identity and the lite drafts; the next reply
 *                      asks for a name again
 *   LITE-NOTIF-06    – this node's `lite.get_info` lists no `lite.lookup_accounts`: `@ki` in the reply
 *                      editor offers nothing and asks the node nothing (liteNotifications.spec.ts has
 *                      the node with it)
 *
 * The page is the `litePost` recording; the gateway is answered in the browser.
 */

test.use({ fixtureTestName: 'litePost' });

const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const GATE = 'test-gateway-1';
const REPLY_GATE = 'test-gateway-2';
const TRX_ID = '0'.repeat(40);
const LITE_IDENTITY_KEY = 'lite-identity';
const LITE_CLIENT_ID_KEY = 'lite-client-id';

const INFO = {
  enabled: true,
  gate_account: GATE,
  chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' }
};
const HEALTH = {
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: { default: { reply: { ready: true, available_in_s: 0 } } }
};

const attestedPermlink = (request: Request): string => {
  const body = request.postDataJSON() as { attest_tx: { operations: { args: { permlink: string } }[] } };
  return body.attest_tx.operations[0].args.permlink;
};

/** Answers the gateway in the browser: /info, /health, every name as available, and /reply as posted. */
async function mockGateway(page: Page) {
  await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
  await page.route('**/api/lite-gateway/names/*/availability', (route) => {
    const name = decodeURIComponent(route.request().url().split('/names/')[1].split('/')[0]);
    return route.fulfill({ json: { name, available: true, lite_grammar_ok: true, l1_grammar_ok: true, lite_taken: false, l1_taken: false } });
  });
  await page.route('**/api/lite-reply', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: INFO });
    return route.fulfill({ json: { ok: true, trx_id: TRX_ID, l1_author: REPLY_GATE, permlink: attestedPermlink(route.request()) } });
  });
}

/** Opens the post's reply box as a guest, types `body` and presses Post. */
async function postGuestReply(page: Page, body: string) {
  const reply = page.getByTestId('comment-reply').first();
  // Until the relay, the node and the gateway health have answered, Reply opens the sign-in dialog.
  await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
  const editor = page.getByTestId('lite-reply-editor');
  await openReplyEditor(reply, editor);
  await editor.locator('.cm-content').fill(body);
  await page.getByTestId('lite-reply-post').click();
}

/** Replies as a fresh guest identity, confirming the suggested name; returns that name. */
async function replyAsNewGuest(page: Page, body: string): Promise<string> {
  await postGuestReply(page, body);
  const status = page.getByTestId('lite-name-status');
  await expect(status).toHaveAttribute('data-state', 'available');
  const name = await page.getByTestId('lite-name-input').inputValue();
  await page.getByTestId('lite-name-confirm').click();
  await expect(new PostPage(page).commentListItems.filter({ hasText: body })).toHaveCount(1);
  return name;
}

const storedKeys = (page: Page) => page.evaluate(() => Object.keys(window.localStorage));

test.describe('Header indicator of the browser lite account (mocked gateway)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGateway(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    await new PostPage(page).waitForPostHydration();
  });

  test('LITE-IDENTITY-01: a guest reply puts the lite account in the header, with its profile link', async ({ page }) => {
    const indicator = page.getByTestId('lite-identity-button');
    await expect(page.getByTestId('login-btn')).toBeVisible();
    await expect(indicator).toHaveCount(0);

    const name = await replyAsNewGuest(page, `Guest reply ${Date.now()}`);

    await expect(page.getByTestId('lite-identity-name')).toHaveText(name);
    await expect(indicator.getByTestId('lite-author-badge')).toBeVisible();
    await indicator.click();
    const menu = page.getByTestId('lite-identity-menu');
    await expect(menu.getByTestId('lite-identity-menu-name')).toHaveText(name);
    await expect(menu.getByTestId('lite-identity-profile')).toHaveAttribute('href', new RegExp(`/@did:lite:${name}$`));
    await expect(menu.getByTestId('lite-identity-sign-in')).toBeVisible();

    await menu.getByTestId('lite-identity-sign-in').click();
    await expect(page.getByTestId('lite-identity-menu')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('LITE-NOTIF-06: no @ completion in the reply editor on a node without lite.lookup_accounts', async ({ page }) => {
    const lookups: string[] = [];
    page.on('request', (request) => {
      if (request.postData()?.includes('"lite.lookup_accounts"')) lookups.push(request.url());
    });
    const reply = page.getByTestId('comment-reply').first();
    await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
    const editor = page.getByTestId('lite-reply-editor');
    await openReplyEditor(reply, editor);
    await editor.locator('.cm-content').fill('Thanks ');
    await page.keyboard.press('End');
    await page.keyboard.type('@ki');

    await expect(editor.locator('.cm-content')).toHaveText('Thanks @ki');
    // Longer than the completion's pause before it asks the node.
    await page.waitForTimeout(1000);
    await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
    expect(lookups).toEqual([]);
  });

  test('LITE-IDENTITY-02: Forget removes the lite account, and the next reply asks for a name again', async ({ page }) => {
    await replyAsNewGuest(page, `Guest reply ${Date.now()}`);
    const indicator = page.getByTestId('lite-identity-button');
    await expect(indicator).toBeVisible();
    // A draft typed for another reply, which forgetting the account removes as well.
    await page.evaluate(() =>
      window.localStorage.setItem('lite-replyTo-/someone/else', JSON.stringify({ value: 'unsent', expiresAt: null }))
    );

    await indicator.click();
    await page.getByTestId('lite-identity-forget').click();
    const dialog = page.getByTestId('lite-forget-dialog');
    await expect(dialog).toContainText('only in this browser');
    await dialog.getByTestId('lite-forget-confirm').click();

    await expect(indicator).toHaveCount(0);
    const keys = await storedKeys(page);
    expect(keys).not.toContain(LITE_IDENTITY_KEY);
    expect(keys.filter((key) => key.startsWith('lite-') && key !== LITE_CLIENT_ID_KEY)).toEqual([]);

    await postGuestReply(page, `Second guest reply ${Date.now()}`);
    await expect(page.getByTestId('lite-name-dialog')).toBeVisible();
  });
});
