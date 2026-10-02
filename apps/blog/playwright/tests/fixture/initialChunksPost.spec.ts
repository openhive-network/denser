import { test, expect } from '../support/fixture-proxy-test';
import { SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * The JS chunks a post page loads up front carry neither wax nor beekeeper (see
 * initialChunks.spec.ts): voting, commenting and editing load them on demand.
 */

test.use({ fixtureTestName: 'postDetail_popover' });

test('PERF-CHUNKS-02 — no chunk referenced from a post HTML contains wax or beekeeper', async ({ request }) => {
  expect(
    await findMarkersInInitialChunks(request, '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit', SIGNING_STACK_MARKERS)
  ).toEqual([]);
});
