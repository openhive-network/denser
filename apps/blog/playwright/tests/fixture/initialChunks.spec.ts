import { test, expect } from '../support/fixture-proxy-test';

/**
 * Initial JS chunks fixture test.
 *
 * Every chunk the server HTML references is fetched before the page loads, so
 * none of them may carry Sentry Session Replay (rrweb): instrumentation-client.ts
 * adds replay after load through a dynamic import(). A static reference to
 * `replayIntegration` from page-load code pulls rrweb back into these chunks.
 *
 * Reads the server HTML only, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const CHUNK_URL_PATTERN = /\/_next\/static\/chunks\/[^"'\s\\]+\.js/g;

test.describe('Initial JS chunks (fixture-based)', () => {
  test('PERF-CHUNKS-01 — no chunk referenced from the /trending HTML contains rrweb', async ({ request }) => {
    const pageResponse = await request.get('/trending');
    expect(pageResponse.status()).toBe(200);
    const html = await pageResponse.text();

    const chunkUrls = [...new Set(html.match(CHUNK_URL_PATTERN) ?? [])];
    expect(chunkUrls.length).toBeGreaterThan(0);

    const chunksWithRrweb: string[] = [];
    for (const chunkUrl of chunkUrls) {
      const chunkResponse = await request.get(chunkUrl);
      expect(chunkResponse.status(), chunkUrl).toBe(200);
      if ((await chunkResponse.text()).includes('rrweb')) {
        chunksWithRrweb.push(chunkUrl);
      }
    }

    expect(chunksWithRrweb).toEqual([]);
  });
});
