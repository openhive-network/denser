import type { Locator, Page } from '@playwright/test';
import { openReplyEditor } from '../support/commentingContext';
import { test, expect } from '../support/fixture-proxy-test';
import {
  NOTE_TEXT,
  OTHER_GATES,
  OTHER_GATEWAY_URL,
  OWN_GATES,
  POST_LITE_NAME,
  POST_URL,
  REPLY_GATE,
  ROOT,
  mockGateway,
  openPost,
  openPostAsItsAuthor,
  serveGateProfile
} from '../support/liteManageContext';
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
 *   LITE-MANAGE-05 – mocked gateway listing the post's gate account in `gate_accounts`: Edit and Delete as before
 *   LITE-MANAGE-06 – mocked gateway listing other gate accounts, on a node without `lite.get_profile`:
 *                    no Edit or Delete, an unlinked "posted through another gateway" note, no profile read
 *                    (`liteManageGatewayProfile.spec.ts`: the note on a node serving it)
 *   LITE-MANAGE-08 – a viewer without the identity sees neither the buttons nor the note
 *   LITE-MANAGE-09 – an edit the gateway refuses with `auth_failed` names the posting authority
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

test.describe('Lite author on a gateway listing its gate accounts (mocked gateway)', () => {
  test('LITE-MANAGE-05: a post made through this gateway keeps Edit and Delete', async ({ page }) => {
    await mockGateway(page, 'tombstone', OWN_GATES);
    await openPostAsItsAuthor(page);
    const actions = page.getByTestId('comment-respons-header');
    await expect(actions.getByTestId('lite-edit')).toBeVisible();
    await expect(actions.getByTestId('lite-delete')).toBeVisible();
    await expect(page.getByTestId('lite-foreign-gateway-note')).toHaveCount(0);
  });

  test('LITE-MANAGE-06: a post another gateway made shows the note, unlinked on a node without lite.get_profile', async ({ page }) => {
    await mockGateway(page, 'tombstone', OTHER_GATES);
    const asked = await serveGateProfile(page, ROOT.author, OTHER_GATEWAY_URL);
    await openPostAsItsAuthor(page);
    const actions = page.getByTestId('comment-respons-header');
    const note = actions.getByTestId('lite-foreign-gateway-note');
    await expect(note).toHaveText(NOTE_TEXT);
    await expect(note.getByTestId('lite-foreign-gateway-link')).toHaveCount(0);
    await expect(page.getByTestId('lite-edit')).toHaveCount(0);
    await expect(page.getByTestId('lite-delete')).toHaveCount(0);
    expect(asked).toEqual([]);
  });

  test('LITE-MANAGE-08: a viewer without the identity sees neither the buttons nor the note', async ({ page }) => {
    await mockGateway(page, 'tombstone', OTHER_GATES);
    await openPost(page);
    await expect(page.getByTestId('comment-respons-header')).toBeVisible();
    await expect(page.getByTestId('lite-foreign-gateway-note')).toHaveCount(0);
    await expect(page.getByTestId('lite-edit')).toHaveCount(0);
    await expect(page.getByTestId('lite-delete')).toHaveCount(0);
  });

  test('LITE-MANAGE-09: an edit refused with auth_failed names the posting authority', async ({ page }) => {
    await mockGateway(page, 'tombstone', OWN_GATES);
    await page.route('**/api/lite-gateway/edit', (route) =>
      route.fulfill({ status: 401, json: { ok: false, code: 'auth_failed', message: 'signature not in posting authority' } })
    );
    await openPostAsItsAuthor(page);
    const form = page.getByTestId('lite-edit-form');
    await openReplyEditor(page.getByTestId('comment-respons-header').getByTestId('lite-edit'), form);
    await form.locator('.cm-content').fill('An edit the gateway refuses.');
    await page.getByTestId('lite-edit-save').click();
    await expect(page.getByText("The key this browser signed with is not, or is no longer, in the lite account's posting authority.")).toBeVisible();
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
