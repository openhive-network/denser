import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS, SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * The JS chunks a profile page loads up front carry neither wax nor beekeeper (see
 * initialChunks.spec.ts): following, muting and transfers load them on demand. Nor do they carry
 * Remarkable: the server derives the post list's card summaries.
 */

test.use({ fixtureTestName: 'userProfileTabs' });

test('PERF-CHUNKS-03 — no chunk referenced from a profile HTML contains wax, beekeeper or Remarkable', async ({
  request
}) => {
  expect(
    await findMarkersInInitialChunks(request, '/@hiveio/posts', [CHUNK_MARKERS.remarkable, ...SIGNING_STACK_MARKERS])
  ).toEqual([]);
});
