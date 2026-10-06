import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS, SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * The JS chunks a post page loads up front carry neither wax nor beekeeper (see
 * initialChunks.spec.ts): voting, commenting and editing load them on demand.
 *
 * Nor do they carry the content renderer: the server renders the post and its replies, and the
 * client loads the renderer only for a body the server didn't render (an edit, a reply preview).
 */

const POST_PATH = '/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit';

test.use({ fixtureTestName: 'postDetail_popover' });

test('PERF-CHUNKS-02 — no chunk referenced from a post HTML contains wax or beekeeper', async ({ request }) => {
  expect(await findMarkersInInitialChunks(request, POST_PATH, SIGNING_STACK_MARKERS)).toEqual([]);
});

test('PERF-CHUNKS-03 — no chunk referenced from a post HTML contains the content renderer', async ({ request }) => {
  expect(await findMarkersInInitialChunks(request, POST_PATH, [CHUNK_MARKERS.renderer])).toEqual([]);
});
