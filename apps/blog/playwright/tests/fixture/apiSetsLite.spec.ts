import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { API_SET_TAB, HealthcheckerPage } from '../support/pages/healthcheckerPage';
import { LITE_LESS_NODE_URL, startLiteLessNode, type ILiteLessNode } from '../support/apiSetsNodes';

/**
 * Each API set goes to a node that serves it: on the blog server whose API endpoint (node A, a stub)
 * lacks lite.*, while the fixture proxy (node B) serves it with a lite-aware recording, lite reads
 * go to B and core and bridge reads stay on A, with no node switched for everything.
 *
 *   API-SETS-03 – /created/lite-test lists the lite post under its did:lite: author on a server that
 *                 has learned nothing yet (probing off, the cold start) and once it has; the
 *                 browser's own core and bridge requests (the sidebar's communities, which the
 *                 recording lacks, so the browser reads them again) go to A, before and after a
 *                 client-side navigation, and the browser never switches its node
 *   API-SETS-01 – a lite post renders under its lite author, read from B; core and bridge stay on A
 *   API-SETS-02 – on /healthchecker, A is not offered for lite; B picked for lite persists across a
 *                 reload, in the server's render too
 *
 * The suite's servers run with DENSER_API_SETS_PROBING=off: probes would be unrecorded calls, to
 * the public catalog nodes too. A server that has served a page has learned what a probe would tell
 * it, so API-SETS-03's second load stands in for a probed server. The `litePost` recording's
 * `lite.get_ranked_posts` of lite-test lists the recorded post, built from its `lite.get_post` answer.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture apiSetsLite
 */

test.use({ fixtureTestName: 'litePost' });
test.describe.configure({ mode: 'serial' });

const LITE_NODE = 'http://localhost:8200';
const POST_PATH = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const LITE_NAME = 'lite-smoke-1016';
const LITE_FEED_PATH = '/created/lite-test';
/** sessionStorage key of the node the browser switched to for the session (hive-chain-service). */
const AUTO_NODE_KEY = 'auto-node-endpoint';

let node: ILiteLessNode | undefined;
let baseURL = '';

test.beforeAll(async ({ apiSetsBaseURL, fixtureProxy: _fixtureProxy, fixturePort }) => {
  if (!apiSetsBaseURL) return;
  baseURL = apiSetsBaseURL;
  node = await startLiteLessNode(`http://localhost:${fixturePort}`);
});

test.afterAll(async () => {
  await node?.close();
});

test.beforeEach(({ apiSetsBaseURL }) => {
  test.skip(!apiSetsBaseURL, 'no blog serves with a lite-less API endpoint');
});

/**
 * Gives `page`'s browser this server's API settings: the suite's servers share one build, whose
 * `__ENV.js` (the browser's settings) is the main server's.
 */
const useThisServersSettings = (page: Page) =>
  page.route(
    (url) => url.origin === new URL(baseURL).origin && url.pathname.endsWith('/__ENV.js'),
    async (route) => {
      const response = await route.fetch();
      const settings = [
        `window.__ENV.REACT_APP_API_ENDPOINT = ${JSON.stringify(LITE_LESS_NODE_URL)};`,
        `window.__ENV.REACT_APP_ALLOWED_HIVE_API_NODES = ${JSON.stringify(`${LITE_LESS_NODE_URL} ${LITE_NODE}`)};`
      ].join('\n');
      await route.fulfill({ response, body: `${await response.text()}\n${settings}\n` });
    }
  );

interface INodeCall {
  node: string;
  method: string;
}

const methodOfBody = (body: string | null): string => {
  try {
    const call: unknown = JSON.parse(body ?? '');
    return typeof call === 'object' && call !== null && 'method' in call && typeof call.method === 'string'
      ? call.method
      : '';
  } catch {
    return '';
  }
};

/** The JSON-RPC calls `page`'s browser sends to node A or B, in order. */
const recordBrowserCalls = (page: Page): INodeCall[] => {
  const calls: INodeCall[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const { origin } = new URL(request.url());
    if (origin !== LITE_LESS_NODE_URL && origin !== LITE_NODE) return;
    calls.push({ node: origin, method: methodOfBody(request.postData()) });
  });
  return calls;
};

/** Not recorded: the server's read fails with a JSON-RPC error, so the browser reads it again. */
const COMMUNITIES_READ = 'bridge.list_communities';

/** Checks that the browser sent its core and bridge calls to A, and no lite call to A. */
const expectCallsOnTheirNodes = (calls: readonly INodeCall[]) => {
  const coreAndBridge = calls.filter(({ method }) => method !== '' && !method.startsWith('lite.'));
  expect(coreAndBridge.filter(({ node }) => node !== LITE_LESS_NODE_URL)).toEqual([]);
  expect(
    calls.filter(({ node, method }) => node === LITE_LESS_NODE_URL && method.startsWith('lite.'))
  ).toEqual([]);
};

// First in the file: the server has learned nothing about the nodes yet.
test('API-SETS-03: the lite feed lists lite authors while the browser keeps core and bridge on A', async ({
  page
}) => {
  await useThisServersSettings(page);
  const calls = recordBrowserCalls(page);
  const postAuthor = page.getByTestId('post-author').first();
  const postTitle = page.locator('[data-testid="post-title"] a').first();

  for (const load of ['cold', 'warm']) {
    await test.step(`${load} server`, async () => {
      calls.length = 0;
      await page.goto(`${baseURL}${LITE_FEED_PATH}`, { waitUntil: 'networkidle' });
      expect(calls).toContainEqual({ node: LITE_LESS_NODE_URL, method: COMMUNITIES_READ });
      await expect(postAuthor).toHaveText(LITE_NAME);
      await expect(postAuthor).toHaveAttribute('href', /\/@did:lite:/);

      await postTitle.click();
      await page.waitForURL(/re-lite-test-478380rd5v/);
      await page.waitForLoadState('networkidle');
      await page.goBack({ waitUntil: 'networkidle' });
      await expect(postAuthor).toHaveText(LITE_NAME);

      expectCallsOnTheirNodes(calls);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), AUTO_NODE_KEY)).toBeNull();
      const { routes } = await new HealthcheckerPage(page).serverRoutes();
      expect(routes.core?.[0]).toBe(LITE_LESS_NODE_URL);
      expect(routes.bridge?.[0]).toBe(LITE_LESS_NODE_URL);
    });
  }
});

test('API-SETS-01: a lite post renders under its lite author while core and bridge stay on the API endpoint', async ({
  page
}) => {
  await useThisServersSettings(page);
  const postPage = new PostPage(page);

  await page.goto(`${baseURL}${POST_PATH}`, { waitUntil: 'domcontentloaded' });
  await postPage.waitForPostHydration();
  await expect(postPage.articleAuthorName).toHaveText(LITE_NAME);
  // Node A was asked lite.* and answered it lacks the API; the post itself came from node B.
  expect(node?.methods).toContain('lite.get_info');

  // The routes the server learned, as the next page carries them to the browser.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(postPage.articleAuthorName).toHaveText(LITE_NAME);
  const { routes } = await new HealthcheckerPage(page).serverRoutes();
  expect(routes.core?.[0]).toBe(LITE_LESS_NODE_URL);
  expect(routes.bridge?.[0]).toBe(LITE_LESS_NODE_URL);
  expect(routes.lite).toEqual([LITE_NODE]);
});

test('API-SETS-02: B picked for lite persists across a reload, server render included; A is not offered', async ({
  page
}) => {
  await useThisServersSettings(page);
  const healthcheckerPage = new HealthcheckerPage(page);

  await healthcheckerPage.goto(baseURL);
  await healthcheckerPage.validatePageIsLoaded();
  await healthcheckerPage.switchToTab(API_SET_TAB.lite);
  await expect(healthcheckerPage.nodeCard(LITE_LESS_NODE_URL).getByTestId('hc-set-node-state')).toHaveText(
    'unsupported'
  );
  await expect(healthcheckerPage.nodeCard(LITE_LESS_NODE_URL).getByTestId('hc-set-node-use')).toHaveCount(0);

  await healthcheckerPage.useNode(LITE_NODE);

  await page.reload();
  await healthcheckerPage.validatePageIsLoaded();
  await healthcheckerPage.switchToTab(API_SET_TAB.lite);
  await expect(healthcheckerPage.selection).toHaveText(`Your choice: ${LITE_NODE}`);
  expect((await healthcheckerPage.serverRoutes()).selections.lite).toBe(LITE_NODE);
});
