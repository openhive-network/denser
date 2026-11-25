import type { Page, Request } from '@playwright/test';
import { PostPage } from './pages/postPage';

/**
 * Shared mocks of the lite manage specs (`liteManage*.spec.ts`): the gateway's endpoints answered
 * in the browser, the recorded lite post (`/lite-test/@test-gateway-1/...`, by `lite-smoke-1016`)
 * opened with or without its author's identity, and the gate's `lite.get_profile`.
 */

export const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
export const POST_LITE_NAME = 'lite-smoke-1016';
export const ROOT = { author: 'test-gateway-1', permlink: 're-lite-test-478380rd5v' };
export const REPLY_GATE = 'test-gateway-2';
const TRX_ID = '0'.repeat(40);

export const INFO = {
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

export type Json = Record<string, unknown>;

const attestedPermlink = (request: Request): string => {
  const body = request.postDataJSON() as { attest_tx: { operations: { args: { permlink: string } }[] } };
  return body.attest_tx.operations[0].args.permlink;
};

/** Answers the gateway in the browser: /info, /health, name availability, /reply, and /edit and /delete as `deleteMode`. */
export async function mockGateway(page: Page, deleteMode: 'l1_delete' | 'tombstone', info: Json = INFO) {
  const calls: { reply: Json[]; edit: Json[]; delete: Json[] } = { reply: [], edit: [], delete: [] };
  await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
  await page.route('**/api/lite-gateway/names/*/availability', (route) => {
    const name = decodeURIComponent(route.request().url().split('/names/')[1].split('/')[0]);
    return route.fulfill({ json: { name, available: true, lite_grammar_ok: true, l1_grammar_ok: true, lite_taken: false, l1_taken: false } });
  });
  await page.route('**/api/lite-reply', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: info });
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

/** Stores the identity of the recorded post's author (a fresh key: the gateway is mocked) and opens the post. */
export async function openPostAsItsAuthor(page: Page) {
  // The package is ESM only; the spec is loaded as CommonJS.
  const { createLiteIdentity } = await import('@hiveio/lite-account');
  const identity = createLiteIdentity(POST_LITE_NAME);
  await page.addInitScript((value) => {
    window.localStorage.setItem('lite-identity', JSON.stringify({ value, expiresAt: null, createdAt: Date.now() }));
  }, identity);
  await openPost(page);
}

export async function openPost(page: Page) {
  await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
  await new PostPage(page).waitForPostHydration();
}

/** Answers the browser's `lite.get_profile` of `account` with `gatewayUrl`; returns the accounts asked. */
export async function serveGateProfile(page: Page, account: string, gatewayUrl: string | null) {
  const asked: string[] = [];
  // JSON-RPC goes to the root of whichever API node the browser reads.
  await page.route((url) => url.pathname === '/', (route) => {
    const request = route.request();
    let body: { id?: unknown; method?: unknown; params?: { account?: string } } | null = null;
    try {
      body = request.method() === 'POST' ? request.postDataJSON() : null;
    } catch {
      body = null;
    }
    if (body?.method !== 'lite.get_profile') return route.fallback();
    asked.push(body.params?.account ?? '');
    if (body.params?.account !== account) return route.fallback();
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { jsonrpc: '2.0', id: body.id, result: { name: account, lite: { gateway: true, gateway_url: gatewayUrl } } }
    });
  });
  return asked;
}

export const OWN_GATES = { ...INFO, gate_accounts: [ROOT.author, REPLY_GATE] };
export const OTHER_GATES = { ...INFO, gate_accounts: ['other-gateway-1'], public_url: 'https://other.example' };
export const OTHER_GATEWAY_URL = 'https://gateway.example/';
export const NOTE_TEXT = 'Posted through another gateway';
