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
 *   API-SETS-01 – a lite post renders under its lite author, read from B; core and bridge stay on A
 *   API-SETS-02 – on /healthchecker, A is not offered for lite; B picked for lite persists across a
 *                 reload, in the server's render too
 *
 * Replay:  pnpm --filter @hive/blog test:fixture apiSetsLite
 */

test.use({ fixtureTestName: 'litePost' });
test.describe.configure({ mode: 'serial' });

const LITE_NODE = 'http://localhost:8200';
const POST_PATH = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const LITE_NAME = 'lite-smoke-1016';

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
