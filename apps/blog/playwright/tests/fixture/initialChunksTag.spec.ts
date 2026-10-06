import { test, expect } from '../support/fixture-proxy-test';
import { CHUNK_MARKERS, SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * The JS chunks a tag or community feed loads up front carry neither wax, beekeeper nor zod (see
 * initialChunks.spec.ts): the community settings form, the only user of zod and wax's language
 * enum there, loads when an admin's sidebar renders.
 *
 * A plain tag feed carries no content renderer either: only a community sidebar renders a
 * description, and it loads the renderer with it.
 */

const TAG_PATH = '/trending/hive';
const COMMUNITY_PATH = '/trending/hive-139531';

test.use({ fixtureTestName: 'ssrSeoGuard' });

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

test('PERF-CHUNKS-05 — no chunk referenced from a community feed HTML contains wax, beekeeper or zod', async ({
  request
}) => {
  expect(
    await findMarkersInInitialChunks(request, COMMUNITY_PATH, [...SIGNING_STACK_MARKERS, CHUNK_MARKERS.zod])
  ).toEqual([]);
});
