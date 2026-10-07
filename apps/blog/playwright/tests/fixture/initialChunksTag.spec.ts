import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS, SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * The JS chunks a tag or community feed loads up front carry neither wax, beekeeper nor zod (see
 * initialChunks.spec.ts): the community settings form, the only user of zod and wax's language
 * enum there, loads when an admin's sidebar renders.
 *
 * Neither carries the content renderer: a plain tag feed renders no markdown, and a community
 * feed's sidebar shows the description the server rendered (the `communityDescription` recording
 * gives hive-139531 one with links, an image and embeds).
 */

const TAG_PATH = '/trending/hive';
const COMMUNITY_PATH = '/trending/hive-139531';

test.use({ fixtureTestName: 'communityDescription' });

test('PERF-CHUNKS-04 — no chunk referenced from a tag feed HTML contains wax, beekeeper, zod or the content renderer', async ({
  request
}) => {
  expect(
    await findMarkersInInitialChunks(request, TAG_PATH, [
      ...SIGNING_STACK_MARKERS,
      CHUNK_MARKERS.zod,
      CHUNK_MARKERS.renderer
    ])
  ).toEqual([]);
});

test('PERF-CHUNKS-05 — no chunk referenced from a community feed HTML contains wax, beekeeper, zod or the content renderer', async ({
  request
}) => {
  expect(
    await findMarkersInInitialChunks(request, COMMUNITY_PATH, [
      ...SIGNING_STACK_MARKERS,
      CHUNK_MARKERS.zod,
      CHUNK_MARKERS.renderer,
      CHUNK_MARKERS.remarkable,
      CHUNK_MARKERS.sanitizeHtml
    ])
  ).toEqual([]);
});
