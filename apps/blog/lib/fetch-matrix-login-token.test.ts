import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` and `@ui/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@ui/lib/logging': `data:text/javascript,${encodeURIComponent(
    'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });'
  )}`,
  '@ui/lib/app-api-path': new URL('../../../packages/ui/lib/app-api-path.ts', import.meta.url).href,
  '@smart-signer/lib/fetch-json': new URL('../../../packages/smart-signer/lib/fetch-json.ts', import.meta.url).href,
  '@smart-signer/lib/csrf-protection': `data:text/javascript,${encodeURIComponent(
    "export const csrfHeaderName = 'x-csrf-token';"
  )}`
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (MODULES[specifier]) return { url: MODULES[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { requestMatrixLoginToken } = await import('./fetch-matrix-login-token.ts');

function replyWith(response: Response): void {
  mock.method(globalThis, 'fetch', async () => response);
}

describe('requestMatrixLoginToken', () => {
  afterEach(() => mock.restoreAll());

  it('answers the token the route gives', async () => {
    replyWith(Response.json({ loginToken: 'syl_alice' }));
    assert.deepEqual(await requestMatrixLoginToken(false), { kind: 'token', loginToken: 'syl_alice' });
  });

  it("passes on a 429's Retry-After", async () => {
    replyWith(Response.json({ error: 'Rate-limited' }, { status: 429, headers: { 'Retry-After': '12' } }));
    assert.deepEqual(await requestMatrixLoginToken(false), { kind: 'rate-limited', retryAfterMs: 12_000 });
  });

  it('waits at most 70 s, however long a 429 asks for', async () => {
    replyWith(Response.json({ error: 'Rate-limited' }, { status: 429, headers: { 'Retry-After': '3600' } }));
    assert.deepEqual(await requestMatrixLoginToken(true), { kind: 'rate-limited', retryAfterMs: 70_000 });

    replyWith(Response.json({ retry_after_ms: 3_600_000 }, { status: 429 }));
    assert.deepEqual(await requestMatrixLoginToken(true), { kind: 'rate-limited', retryAfterMs: 70_000 });
  });
});
