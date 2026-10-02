import { test, expect } from '../support/fixture-proxy-test';
import { SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * The JS chunks a profile page loads up front carry neither wax nor beekeeper (see
 * initialChunks.spec.ts): following, muting and transfers load them on demand.
 */

test.use({ fixtureTestName: 'userProfileTabs' });

test('PERF-CHUNKS-03 — no chunk referenced from a profile HTML contains wax or beekeeper', async ({ request }) => {
  expect(await findMarkersInInitialChunks(request, '/@hiveio/posts', SIGNING_STACK_MARKERS)).toEqual([]);
});
