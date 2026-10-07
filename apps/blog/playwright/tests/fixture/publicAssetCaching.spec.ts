import { test, expect } from '../support/fixture-proxy-test';

/**
 * Cache headers of the public/ files copy:public generates, as the app's server
 * sends them (next.config.js headers()). In follow mode caddy serves the same files
 * with the same headers (stack/integration/Caddyfile.static.releases).
 *
 * hb-auth's worker.js, the translations and the signer's images have no content
 * hash in their names: a browser revalidates them on every use and gets a 304 while
 * they are unchanged, instead of downloading them again. worker.js used to be
 * no-store, which forced the full download. hb-auth's assets/ (the beekeeper WASM)
 * are named by content hash and immutable.
 *
 * Reads server responses only, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const WORKER_PATH = '/auth/worker.js';
const WASM_REFERENCE_PATTERN = /assets\/[\w.-]+\.wasm/;

test.describe('Public assets — cache headers', () => {
  test('PUBLIC-CACHE-01 — the unhashed public files revalidate to a 304; the beekeeper WASM is immutable', async ({
    request
  }) => {
    const worker = await request.get(WORKER_PATH);
    expect(worker.status()).toBe(200);
    const wasmReference = (await worker.text()).match(WASM_REFERENCE_PATTERN)?.[0];
    expect(wasmReference, 'worker.js names its WASM').toBeTruthy();

    const wasm = await request.get(`/auth/${wasmReference}`);
    expect(wasm.status()).toBe(200);
    expect(wasm.headers()['content-type']).toBe('application/wasm');
    expect(wasm.headers()['cache-control']).toBe('public, max-age=31536000, immutable');

    for (const path of [WORKER_PATH, '/locales/en/common_blog.json', '/smart-signer/images/metamask.svg']) {
      const first = await request.get(path);
      expect(first.status(), path).toBe(200);
      expect(first.headers()['cache-control'], path).not.toContain('no-store');
      expect(first.headers()['cache-control'], path).not.toContain('immutable');
      const etag = first.headers()['etag'];
      expect(etag, `${path} has an ETag`).toBeTruthy();

      const repeat = await request.get(path, { headers: { 'if-none-match': etag } });
      expect(repeat.status(), `${path} revalidated`).toBe(304);
    }
    expect((await request.get(WORKER_PATH)).headers()['cache-control']).toBe('public, max-age=0, must-revalidate');
  });
});
