import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS, SENTRY_MARKERS, SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * Initial JS chunks fixture test.
 *
 * Every chunk the server HTML references is fetched before the page loads, so
 * none of them may carry the Sentry SDK: instrumentation-client.ts loads it
 * through a dynamic import() only when a DSN is configured, and adds Session
 * Replay (rrweb) after load through another. A static import of `@sentry/nextjs`
 * from page-load code pulls the SDK back into these chunks.
 *
 * Nor may they carry wax's JavaScript or hb-auth's beekeeper: reads go through
 * the wax-free read client, and signing, login and transactions are loaded
 * through dynamic import()s when a user logs in or writes. A static import of
 * wax, the signers or `@transaction/index` from page-load code pulls them back.
 * initialChunksPost.spec.ts and initialChunksProfile.spec.ts check a post and a
 * profile.
 *
 * Reads the server HTML only, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

test.describe('Initial JS chunks (fixture-based)', () => {
  test('PERF-CHUNKS-01 — no chunk referenced from the /trending HTML contains Sentry, rrweb, wax or beekeeper', async ({
    request
  }) => {
    expect(
      await findMarkersInInitialChunks(request, '/trending', [...SENTRY_MARKERS, CHUNK_MARKERS.rrweb, ...SIGNING_STACK_MARKERS])
    ).toEqual([]);
  });
});
