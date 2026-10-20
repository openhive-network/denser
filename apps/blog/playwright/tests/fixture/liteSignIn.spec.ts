import fs from 'fs';
import path from 'path';
import { isDeepStrictEqual } from 'util';
import type { Page, Route } from '@playwright/test';
import { openReplyEditor } from '../support/commentingContext';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { test, expect } from '../support/fixture-proxy-test';
import { LoginForm } from '../support/pages/loginForm';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * A guest who started writing as a lite account signs in with their Hive account instead, and
 * what they typed opens in the signed-in editor.
 *
 *   LITE-SIGNIN-01 – reply: Post → "Sign in … instead" in the name dialog → Keychain sign-in; the
 *                    normal reply box is open on the same post with the typed text, the lite draft is gone
 *   LITE-SIGNIN-02 – the reply box's "or sign in" link opens the sign-in dialog without the name dialog
 *   LITE-SIGNIN-03 – root post: "Sign in … instead" from the submit page's name dialog; the post
 *                    editor holds the guest's title, body and tags, the lite draft is gone
 *
 * The page is the `litePost` recording; the gateway is answered in the browser, Keychain is a stub
 * and verify_authority is stubbed (see loginExtension.spec.ts). The sign-in's own reads of `gtg`
 * (accounts, RC, global properties, profile, lists) are not in that recording: the browser's
 * calls that `accountSwitchLogout` (which signs `gtg` in) recorded are answered from it, and the
 * signed-in page's reads of gtg's subscriptions and reblogs, recorded nowhere, as empty.
 */

test.use({ fixtureTestName: 'litePost' });

const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const POST_AUTHOR = 'did:lite:lite-smoke-1016';
const POST_PERMLINK = 're-lite-test-478380rd5v';
const USERNAME = 'gtg';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;
const KEYCHAIN_SIGNATURE = `1f${'ab'.repeat(64)}`;
const LITE_REPLY_DRAFT_KEY = `lite-replyTo-/${POST_AUTHOR}/${POST_PERMLINK}`;
const LITE_POST_DRAFT_KEY = 'lite-postData-new';

const API_NODE = 'http://localhost:8200';
const SIGN_IN_RECORDING = path.join(__dirname, '../mock/fixtures/accountSwitchLogout');

// Reads only the signed-in pages make; their answers do not matter to the hand-off.
const EMPTY_SIGNED_IN_READS = new Set(['bridge.list_all_subscriptions', 'condenser_api.get_reblogged_by']);

type RecordedCall = { method: string; params: unknown; response: { result?: unknown } };

const signInRecording = (): RecordedCall[] =>
  fs
    .readdirSync(SIGN_IN_RECORDING)
    .filter((file) => /^\d{4}-.*\.json$/.test(file))
    .map((file) => JSON.parse(fs.readFileSync(path.join(SIGN_IN_RECORDING, file), 'utf8')));

/** Answers the browser's JSON-RPC calls that the sign-in recording holds, and the empty reads; the rest go to the proxy. */
async function answerSignInReads(page: Page): Promise<void> {
  const recorded = signInRecording();
  await page.route(`${API_NODE}/**`, (route: Route) => {
    const body: unknown = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    if (typeof body !== 'object' || body === null || Array.isArray(body) || !('method' in body)) return route.fallback();
    const params = 'params' in body ? body.params : undefined;
    const call = recorded.find((entry) => entry.method === body.method && isDeepStrictEqual(entry.params, params));
    const id = 'id' in body ? body.id : 0;
    if (call) return route.fulfill({ json: { ...call.response, id } });
    if (typeof body.method === 'string' && EMPTY_SIGNED_IN_READS.has(body.method)) {
      return route.fulfill({ json: { jsonrpc: '2.0', result: [], id } });
    }
    return route.fallback();
  });
}

const INFO = {
  enabled: true,
  gate_account: 'test-gateway-1',
  chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' }
};
const HEALTH = {
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: { default: { reply: { ready: true, available_in_s: 0 }, root: { ready: true, available_in_s: 0 } } }
};
const AVAILABILITY = /\/api\/lite-gateway\/names\/([^/]+)\/availability$/;

async function mockGateway(page: Page) {
  await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
  await page.route('**/api/lite-reply', (route) => route.fulfill({ json: INFO }));
  await page.route(AVAILABILITY, (route) => {
    const name = decodeURIComponent(AVAILABILITY.exec(route.request().url())?.[1] ?? '');
    return route.fulfill({
      json: { name, available: true, lite_grammar_ok: true, l1_grammar_ok: true, lite_taken: false, l1_taken: false }
    });
  });
}

async function installKeychainStub(page: Page): Promise<void> {
  await page.addInitScript((signature) => {
    type Callback = (response: { success: boolean; result: unknown }) => void;
    Reflect.set(window, 'hive_keychain', {
      requestSignBuffer: (_account: string, _message: string, _role: string, callback: Callback) =>
        callback({ success: true, result: signature }),
      requestSignTx: (_account: string, tx: object, _role: string, callback: Callback) =>
        callback({ success: true, result: { ...tx, signatures: [signature] } })
    });
  }, KEYCHAIN_SIGNATURE);
}

async function signInWithKeychain(page: Page): Promise<void> {
  const loginForm = new LoginForm(page);
  await expect(loginForm.usernameInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
  await loginForm.usernameInput.fill(USERNAME);
  await page.getByRole('button', { name: enSmartSigner.login_form.extension_sign_in.keychain }).click();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
}

const storedKey = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key);

async function openGuestReply(page: Page) {
  const postPage = new PostPage(page);
  await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
  await postPage.waitForPostHydration();
  const editor = page.getByTestId('lite-reply-editor');
  await openReplyEditor(page.getByTestId('comment-reply').first(), editor);
  return editor;
}

test.describe('A guest signs in instead and keeps the draft (mocked gateway, Keychain stub)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGateway(page);
    await installKeychainStub(page);
    // The stub's signature is no key of the account: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    // After the interceptor, so it is asked first (the interceptor passes reads on to the network)
    await answerSignInReads(page);
  });

  test('LITE-SIGNIN-01: the typed reply opens in the signed-in reply box of the same post', async ({ page }) => {
    const text = `Guest reply kept through sign-in ${Date.now()}`;
    const editor = await openGuestReply(page);
    await editor.locator('.cm-content').fill(text);
    await page.getByTestId('lite-reply-post').click();
    await expect(page.getByTestId('lite-name-dialog')).toBeVisible();

    await page.getByTestId('lite-name-sign-in').click();
    await expect(page.getByTestId('lite-name-dialog')).toHaveCount(0);
    await signInWithKeychain(page);

    const replyEditor = page.getByTestId('reply-editor');
    await expect(replyEditor).toBeVisible();
    await expect(replyEditor.locator('.cm-content')).toHaveText(text);
    await expect(page.getByTestId('lite-reply-editor')).toHaveCount(0);
    expect(await storedKey(page, LITE_REPLY_DRAFT_KEY)).toBeNull();
    expect(await storedKey(page, `replyTo-/${POST_AUTHOR}/${POST_PERMLINK}-${USERNAME}`)).toContain(text);
  });

  test('LITE-SIGNIN-02: the reply box offers signing in before anything is typed', async ({ page }) => {
    const editor = await openGuestReply(page);
    await editor.getByTestId('lite-reply-sign-in').click();

    await expect(new LoginForm(page).usernameInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await expect(page.getByTestId('lite-name-dialog')).toHaveCount(0);
  });

  test('LITE-SIGNIN-03: the guest root-post draft opens in the signed-in post editor', async ({ page }) => {
    const draft = { title: `Guest title ${Date.now()}`, body: 'Guest body kept through sign-in', tags: 'lite-test', category: 'blog' };
    await page.goto('/submit.html');
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + 3_600_000, createdAt: Date.now() })),
      { key: LITE_POST_DRAFT_KEY, value: draft }
    );
    await page.getByTestId('lite-post-start').click();
    await expect(page.getByTestId('lite-name-dialog')).toBeVisible();

    await page.getByTestId('lite-name-sign-in').click();
    await signInWithKeychain(page);

    const postEditor = new PostEditorPage(page);
    await expect(postEditor.getPostTitleInput).toHaveValue(draft.title);
    await expect(postEditor.getEditorContent).toContainText(draft.body);
    await expect(page.getByTestId('lite-post-form')).toHaveCount(0);
    expect(await storedKey(page, LITE_POST_DRAFT_KEY)).toBeNull();
  });
});
