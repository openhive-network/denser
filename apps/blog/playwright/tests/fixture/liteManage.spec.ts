import type { Locator, Page, Request } from '@playwright/test';
import { openReplyEditor } from '../support/commentingContext';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * A lite author edits and deletes their own reply through the gateway (`/edit`, `/delete`).
 *
 *   LITE-MANAGE-01 – mocked gateway: the guest's reply (to a DID-authored post, sent with its gate
 *                    account as parent) gets Edit and Delete; the edit shows, and an l1_delete
 *                    takes the reply off the page
 *   LITE-MANAGE-02 – mocked gateway: a delete answered `tombstone` leaves the reply as "deleted by the author"
 *   LITE-MANAGE-03 – mocked gateway: the post's own lite author edits its title and body on the post
 *                    page, and a tombstone delete leaves the post as "deleted by the author"
 *   LITE-MANAGE-04 – real gateway: reply as a guest, edit it, delete it (l1_delete: it has no replies)
 *
 * The page is the `litePost` recording (a lite-aware node). 01 and 02 answer the gateway's
 * endpoints in the browser, so they run in the fixture suite. 03 needs a gateway: it runs only on
 * the dev stack started with DENSER_SERVER_LITE_GATEWAY_URL (the test namespace on steem-16), as a
 * fresh identity; the recording never shows the reply indexed, so each state is asserted on the
 * page's own (optimistic) entry.
 *
 *   DENSER_SERVER_LITE_GATEWAY_URL=https://steem-16.syncad.com/lite-gateway-api \
 *     .aidev/dev-stack-spec.sh playwright/tests/fixture/liteManage.spec.ts --retries=0
 */

test.use({ fixtureTestName: 'litePost' });

const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const POST_LITE_NAME = 'lite-smoke-1016';
const ROOT = { author: 'test-gateway-1', permlink: 're-lite-test-478380rd5v' };
const REPLY_GATE = 'test-gateway-2';
const TRX_ID = '0'.repeat(40);

const INFO = {
  enabled: true,
  gate_account: ROOT.author,
  chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
  features: { edits: true, deletes: true, tombstone_deletes: true }
};
const HEALTH = {
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: { default: { reply: { ready: true, available_in_s: 0 }, root: { ready: true, available_in_s: 0 } } }
};

type Json = Record<string, unknown>;

const attestedPermlink = (request: Request): string => {
  const body = request.postDataJSON() as { attest_tx: { operations: { args: { permlink: string } }[] } };
  return body.attest_tx.operations[0].args.permlink;
};

/** Answers the gateway in the browser: /info, /health, /reply, and /edit and /delete as `deleteMode`. */
async function mockGateway(page: Page, deleteMode: 'l1_delete' | 'tombstone') {
  const calls: { reply: Json[]; edit: Json[]; delete: Json[] } = { reply: [], edit: [], delete: [] };
  await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
  await page.route('**/api/lite-reply', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: INFO });
    calls.reply.push(route.request().postDataJSON() as Json);
    return route.fulfill({ json: { ok: true, trx_id: TRX_ID, l1_author: REPLY_GATE, permlink: attestedPermlink(route.request()) } });
  });
  await page.route('**/api/lite-gateway/edit', (route) => {
    const body = route.request().postDataJSON() as Json;
    calls.edit.push(body);
    return route.fulfill({ json: { ok: true, trx_id: TRX_ID, l1_author: body.l1_author, permlink: body.permlink } });
  });
  await page.route('**/api/lite-gateway/delete', (route) => {
    const body = route.request().postDataJSON() as Json;
    calls.delete.push(body);
    return route.fulfill({ json: { ok: true, trx_id: TRX_ID, l1_author: body.l1_author, permlink: body.permlink, mode: deleteMode } });
  });
  return calls;
}

/** Replies to the post as a fresh guest identity; returns the reply's card. */
async function replyAsGuest(page: Page, body: string) {
  const postPage = new PostPage(page);
  await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
  await postPage.waitForPostHydration();
  // Until the relay, the node and the gateway health have answered, Reply opens the sign-in dialog.
  const reply = page.getByTestId('comment-reply').first();
  await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
  const editor = page.getByTestId('lite-reply-editor');
  await openReplyEditor(reply, editor);
  await editor.locator('.cm-content').fill(body);
  await page.getByTestId('lite-reply-post').click();
  await page.getByTestId('lite-name-confirm').click();
  const card = postPage.commentListItems.filter({ hasText: body });
  await expect(card).toHaveCount(1);
  await expect(card.getByTestId('lite-edit')).toBeVisible({ timeout: 30_000 });
  return card;
}

async function editReply(page: Page, card: Locator, body: string) {
  const form = page.getByTestId('lite-edit-form');
  await openReplyEditor(card.getByTestId('lite-edit'), form);
  await form.locator('.cm-content').fill(body);
  await page.getByTestId('lite-edit-save').click();
  await expect(form).toHaveCount(0, { timeout: 30_000 });
}

async function deleteReply(page: Page, card: Locator) {
  await openReplyEditor(card.getByTestId('lite-delete'), page.getByTestId('lite-delete-dialog'));
  await page.getByTestId('lite-delete-confirm').click();
}

test.describe('Lite author edits and deletes their reply (mocked gateway)', () => {
  test('LITE-MANAGE-01: the reply is edited in place, and an l1_delete removes it', async ({ page }) => {
    const calls = await mockGateway(page, 'l1_delete');
    const card = await replyAsGuest(page, `Guest reply ${Date.now()}`);
    // The post's author is a DID on this node; the gateway is given its gate account.
    expect(calls.reply[0]).toMatchObject({ comment: { parent_author: ROOT.author, parent_permlink: ROOT.permlink } });

    const edited = `Edited guest reply ${Date.now()}`;
    await editReply(page, card, edited);
    const editedCard = new PostPage(page).commentListItems.filter({ hasText: edited });
    await expect(editedCard).toHaveCount(1);
    expect(calls.edit).toHaveLength(1);
    expect(calls.edit[0]).toMatchObject({ l1_author: REPLY_GATE, comment: { parent_author: ROOT.author, parent_permlink: ROOT.permlink, title: '', body: edited } });

    await deleteReply(page, editedCard);
    await expect(editedCard).toHaveCount(0);
    expect(calls.delete).toHaveLength(1);
    expect(calls.delete[0]).toMatchObject({ l1_author: REPLY_GATE, permlink: calls.edit[0].permlink });
    expect(calls.delete[0]).toHaveProperty('retract_tx');
  });

  test('LITE-MANAGE-02: a tombstone delete leaves the reply as deleted by its author', async ({ page }) => {
    await mockGateway(page, 'tombstone');
    const body = `Guest reply to tombstone ${Date.now()}`;
    const card = await replyAsGuest(page, body);
    const permlinkLink = card.getByTestId('comment-timestamp-link');
    const anchor = await permlinkLink.getAttribute('href');

    await deleteReply(page, card);
    const tombstone = page.locator(`li[data-testid="comment-list-item"]:has(a[href="${anchor}"])`);
    await expect(tombstone.getByTestId('lite-tombstone')).toBeVisible();
    await expect(tombstone).not.toContainText(body);
    await expect(tombstone.getByTestId('lite-edit')).toHaveCount(0);
    await expect(tombstone.getByTestId('lite-delete')).toHaveCount(0);
  });
});

test.describe('Lite author edits and deletes their root post (mocked gateway)', () => {
  test('LITE-MANAGE-03: the post is edited on its page, and a tombstone delete shows it deleted', async ({ page }) => {
    const calls = await mockGateway(page, 'tombstone');
    // This browser holds the identity of the recorded post's author (a fresh key: the gateway is mocked).
    // The package is ESM only; the spec is loaded as CommonJS.
    const { createLiteIdentity } = await import('@hiveio/lite-account');
    const identity = createLiteIdentity(POST_LITE_NAME);
    await page.addInitScript((value) => {
      window.localStorage.setItem('lite-identity', JSON.stringify({ value, expiresAt: null, createdAt: Date.now() }));
    }, identity);
    const postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    // The post's actions row; the author's recorded replies have their own Edit and Delete.
    const actions = page.getByTestId('comment-respons-header');
    const form = page.getByTestId('lite-edit-form');
    await openReplyEditor(actions.getByTestId('lite-edit'), form);
    const title = `Edited lite post ${Date.now()}`;
    await page.getByTestId('lite-edit-title').fill(title);
    await form.locator('.cm-content').fill('Edited body of the lite post.');
    await page.getByTestId('lite-edit-save').click();
    await expect(form).toHaveCount(0);
    await expect(postPage.articleTitle).toHaveText(title);
    expect(calls.edit[0]).toMatchObject({
      attester: POST_LITE_NAME,
      l1_author: ROOT.author,
      permlink: ROOT.permlink,
      comment: { parent_author: '', parent_permlink: 'lite-test', title, tags: ['lite-test'] }
    });

    await openReplyEditor(actions.getByTestId('lite-delete'), page.getByTestId('lite-delete-dialog'));
    await page.getByTestId('lite-delete-confirm').click();
    await expect(page.getByTestId('lite-tombstone')).toHaveCount(1);
    await expect(actions.getByTestId('lite-edit')).toHaveCount(0);
    await expect(actions.getByTestId('lite-delete')).toHaveCount(0);
    expect(calls.delete[0]).toMatchObject({ attester: POST_LITE_NAME, l1_author: ROOT.author, permlink: ROOT.permlink });
  });
});

test.describe('Lite author edits and deletes their reply (dev stack, real gateway)', () => {
  test.skip(
    !process.env.DENSER_SERVER_LITE_GATEWAY_URL,
    'host-environment precondition: DENSER_SERVER_LITE_GATEWAY_URL names no lite gateway (dev stack with a gateway only)'
  );

  test('LITE-MANAGE-04: a guest replies, edits the reply and deletes it from the chain', async ({ page }) => {
    test.setTimeout(120_000);
    const card = await replyAsGuest(page, `Posted by the denser lite manage spec at ${new Date().toISOString()}.`);

    const edited = `Edited by the denser lite manage spec at ${new Date().toISOString()}.`;
    const editAnswer = page.waitForResponse((r) => r.url().endsWith('/api/lite-gateway/edit'));
    await editReply(page, card, edited);
    expect((await editAnswer).status()).toBe(200);
    const editedCard = new PostPage(page).commentListItems.filter({ hasText: edited });
    await expect(editedCard).toHaveCount(1);

    const deleteAnswer = page.waitForResponse((r) => r.url().endsWith('/api/lite-gateway/delete'));
    await deleteReply(page, editedCard);
    const answer = await deleteAnswer;
    expect(answer.status()).toBe(200);
    expect(await answer.json()).toMatchObject({ ok: true, mode: 'l1_delete' });
    await expect(editedCard).toHaveCount(0);
  });
});
