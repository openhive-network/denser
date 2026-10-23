import { openReplyEditor } from '../support/commentingContext';
import { test, expect } from '../support/fixture-proxy-test';
import {
  chainTimeIn,
  keyMember,
  mockPasskeyGateway,
  OTHER_DEVICE_KEY,
  ROOT_KEY,
  SIGNER,
  storedIdentity,
  stubSigners,
  type Authority
} from '../support/litePasskeyContext';

/**
 * Signing in to a passkey-secured lite account on another device, on the `litePost` recording
 * (its post takes a guest reply). The gateway's authority read, `/l2` and `/reply` are answered
 * in the browser; the signer popup is a stub speaking the hive-passkey-signer protocol.
 *
 *   LITE-ID-03 – a fresh browser enters the name, the root signs a new posting key in the signer
 *                named by the account's root; the browser ends with that key only (a current
 *                posting member, 90 days, `kind: device`) and replies as the account
 *   LITE-ID-09 – a guest's first reply prompts, without blocking, to secure the new lite account;
 *                a reload does not prompt again
 *
 * The other LITE-ID specs are in liteIdentityPasskey.spec.ts.
 */

test.use({ fixtureTestName: 'litePost' });

const LITE_NAME = 'lite-smoke-1016';
const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const HEALTH = {
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: { default: { reply: { ready: true, available_in_s: 0 } } }
};

/** A secured account with one other device. */
const securedAuthority = (): Authority => ({
  owner: [keyMember(ROOT_KEY, { meta: { kind: 'passkey', signer: SIGNER } })],
  posting: [
    keyMember(OTHER_DEVICE_KEY, {
      expires: chainTimeIn(60),
      meta: { kind: 'device', label: 'Firefox · Android', signer: SIGNER }
    })
  ]
});

test.describe('Lite account sign-in on another device (fixture-based, mocked gateway and signer)', () => {
  test('LITE-ID-03: a fresh browser signs in with the passkey and posts as the account', async ({
    page,
    context
  }) => {
    const opened = await stubSigners(context);
    const gateway = await mockPasskeyGateway(page, LITE_NAME, securedAuthority());
    await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
    const replies: Record<string, unknown>[] = [];
    await page.route('**/api/lite-reply', (route) => {
      if (route.request().method() === 'GET') return route.fallback();
      const body = route.request().postDataJSON() as {
        attester: string;
        attest_tx: { operations: { args: { permlink: string } }[] };
      };
      replies.push(body);
      return route.fulfill({
        json: {
          ok: true,
          trx_id: '0'.repeat(40),
          l1_author: 'test-gateway-2',
          permlink: body.attest_tx.operations[0].args.permlink
        }
      });
    });
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });

    const reply = page.getByTestId('comment-reply').first();
    await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
    const editor = page.getByTestId('lite-reply-editor');
    await openReplyEditor(reply, editor);
    await editor.locator('.cm-content').fill('Reply from a second device');
    await page.getByTestId('lite-reply-post').click();
    await page.getByTestId('lite-name-dialog').getByTestId('lite-name-sign-in-device').click();

    const dialog = page.getByTestId('lite-sign-in-dialog');
    await dialog.getByTestId('lite-sign-in-name').fill(LITE_NAME);
    await dialog.getByTestId('lite-sign-in-continue').click();
    await expect(dialog.getByTestId('lite-sign-in-signer')).toContainText('signer.syncad.com');
    await dialog.getByTestId('lite-sign-in-label').fill('Test browser');
    await dialog.getByTestId('lite-sign-in-confirm').click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });

    expect(opened).toEqual([SIGNER]);
    const stored = await storedIdentity(page);
    expect(stored).toMatchObject({
      name: LITE_NAME,
      secured: true,
      registered: true,
      signer: SIGNER,
      ownerPublicKey: ROOT_KEY
    });
    expect(stored).not.toHaveProperty('ownerWif');
    const added = gateway.authority.posting.find((member) => member.value === stored?.postingPublicKey);
    expect(added?.meta).toEqual({ kind: 'device', label: 'Test browser', signer: SIGNER });
    expect(Date.parse(`${added?.expires}Z`) - Date.now()).toBeGreaterThan(89 * 86_400_000);
    await expect(page.getByTestId('lite-identity-name')).toHaveText(LITE_NAME);

    // The reply goes out as the account, with no registration: the account is on chain.
    await page.getByTestId('lite-reply-post').click();
    await expect.poll(() => replies.length).toBe(1);
    expect(replies[0]).toMatchObject({ attester: LITE_NAME });
    expect(replies[0]).not.toHaveProperty('register_tx');
  });

  test('LITE-ID-09: the first reply prompts to secure the account, once', async ({ page }) => {
    await mockPasskeyGateway(page, LITE_NAME, securedAuthority());
    await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
    await page.route('**/api/lite-gateway/names/*/availability', (route) => {
      const name = decodeURIComponent(route.request().url().split('/names/')[1].split('/')[0]);
      return route.fulfill({
        json: {
          name,
          available: true,
          lite_grammar_ok: true,
          l1_grammar_ok: true,
          lite_taken: false,
          l1_taken: false
        }
      });
    });
    await page.route('**/api/lite-reply', (route) => {
      if (route.request().method() === 'GET') return route.fallback();
      const body = route.request().postDataJSON() as {
        attest_tx: { operations: { args: { permlink: string } }[] };
      };
      return route.fulfill({
        json: {
          ok: true,
          trx_id: '0'.repeat(40),
          l1_author: 'test-gateway-2',
          permlink: body.attest_tx.operations[0].args.permlink
        }
      });
    });
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });

    const reply = page.getByTestId('comment-reply').first();
    await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
    const editor = page.getByTestId('lite-reply-editor');
    await openReplyEditor(reply, editor);
    await editor.locator('.cm-content').fill('First guest reply');
    await page.getByTestId('lite-reply-post').click();
    await expect(page.getByTestId('lite-name-status')).toHaveAttribute('data-state', 'available');
    await page.getByTestId('lite-name-confirm').click();

    const prompt = page.getByTestId('lite-secure-prompt');
    await expect(prompt).toContainText('This account lives only in this browser.');
    await prompt.getByTestId('lite-secure-prompt-action').click();
    await expect(page.getByTestId('lite-secure-dialog')).toBeVisible();
    await expect(prompt).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('lite-identity-button')).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(prompt).toHaveCount(0);
  });
});
