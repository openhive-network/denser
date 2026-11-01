import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { API_SET_TAB, HealthcheckerPage } from '../support/pages/healthcheckerPage';
import {
  LITE_LESS_NODE_URL,
  startBlogServer,
  startLiteLessNode,
  type IBlogServer,
  type ILiteLessNode
} from '../support/apiSetsNodes';

/**
 * Each API set goes to a node that serves it: on the blog server whose API endpoint (node A, a stub)
 * lacks lite.*, while the fixture proxy (node B) serves it with a lite-aware recording, lite reads
 * go to B and core and bridge reads stay on A, with no node switched for everything.
 *
 *   API-SETS-03 – /created/lite-test lists the lite post under its did:lite: author on a server that
 *                 has made no call yet and once it has; the browser's own core and bridge requests
 *                 (the sidebar's communities, which the recording lacks, so the browser reads them
 *                 again) go to A, before and after a client-side navigation, and the browser never
 *                 switches its node
 *   API-SETS-01 – a lite post renders under its lite author, read from B; core and bridge stay on A
 *   API-SETS-02 – on /healthchecker, A is not offered for lite; B picked for lite persists across a
 *                 reload, in the server's render too
 *   API-SETS-04 – the browser's own lite read starts at A (the page's routes list A first for lite, as
 *                 a server that has not yet learned A lacks it renders them): A refuses it, B serves
 *                 it, and the browser still sends core and bridge to A and never switches its node
 *   API-SETS-05 – (probing only) the server probed A for core, bridge and lite once A was up, before
 *                 any page
 *
 * The suite runs twice. In the default project the server runs with DENSER_API_SETS_PROBING=off, the
 * cold start: a server that has served a page has learned what a probe would tell it, so API-SETS-03's
 * second load stands in for a probed server. The probing project (playwright.fixture.config.ts) has
 * this file start a probing server once A and B are up, as production probes: the `litePost`
 * recording answers its probes of B and A, the public catalog nodes are refused. The recording's
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
let server: IBlogServer | undefined;
let baseURL = '';

test.beforeAll(async ({ apiSetsBaseURL, apiSetsServer, fixtureProxy: _fixtureProxy, fixturePort }) => {
  if (!apiSetsBaseURL) return;
  baseURL = apiSetsBaseURL;
  node = await startLiteLessNode(`http://localhost:${fixturePort}`);
  if (apiSetsServer) server = await startBlogServer(apiSetsServer);
});

test.afterAll(async () => {
  await server?.close();
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

/**
 * Lists A first for lite in the routes `path`'s page was rendered with (`ApiSetsBootstrap`), as a
 * server that has not learned yet that A lacks lite.* renders them: the browser's lite reads then
 * start at A. Rewritten in the page, not in the HTML: Chrome lets a page that `route.fulfill` served
 * call no loopback node. React keeps a data block's text as parsed; the browser reads it on its
 * first call.
 */
const listLiteLessNodeFirstForLite = (page: Page, path: string) =>
  page.addInitScript(
    ({ id, path, lite }) => {
      const withoutSlash = (value: string) => value.replace(/\/$/, '');
      if (withoutSlash(location.pathname) !== withoutSlash(path)) return;
      const rewrite = () => {
        const block = document.getElementById(id);
        if (!block?.textContent) return;
        const bootstrap = JSON.parse(block.textContent);
        if (JSON.stringify(bootstrap.routes.lite) === JSON.stringify(lite)) return;
        bootstrap.routes.lite = lite;
        block.textContent = JSON.stringify(bootstrap);
      };
      const observer = new MutationObserver(rewrite);
      observer.observe(document, { childList: true, subtree: true, characterData: true });
      document.addEventListener('DOMContentLoaded', () => {
        rewrite();
        observer.disconnect();
      });
    },
    { id: 'denser-api-sets', path, lite: [LITE_LESS_NODE_URL, LITE_NODE] }
  );

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

/** The JSON-RPC calls of the server's probes (`PROBES` in packages/transaction/lib/api-sets/definitions.ts). */
const PROBE_METHODS = ['database_api.get_dynamic_global_properties', 'bridge.get_post', 'lite.get_info'];

// Before any page: A has been asked nothing but the probes.
test('API-SETS-05: a probing server started once its nodes are up has probed A for core, bridge and lite', async ({
  apiSetsServer
}) => {
  test.skip(!apiSetsServer, 'the server does not probe');
  await expect.poll(() => [...new Set(node?.methods)].sort()).toEqual([...PROBE_METHODS].sort());
});

// The file's first page: the server has learned nothing about the nodes from calls yet.
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

test('API-SETS-04: a browser lite read A refuses and B serves leaves core and bridge on A', async ({
  page
}) => {
  await useThisServersSettings(page);
  await listLiteLessNodeFirstForLite(page, POST_PATH);
  const calls = recordBrowserCalls(page);
  const postPage = new PostPage(page);
  const discussionReads = () => calls.filter(({ method }) => method === 'lite.get_discussion');

  await page.goto(`${baseURL}${POST_PATH}`, { waitUntil: 'networkidle' });
  await postPage.waitForPostHydration();
  expect((await new HealthcheckerPage(page).serverRoutes()).routes.lite?.[0]).toBe(LITE_LESS_NODE_URL);
  expect(discussionReads()).toEqual([]);

  // A comment sort the server did not render: the browser reads the whole discussion itself.
  await postPage.getCommentFilter.click();
  await postPage.getCommentFilterList.getByRole('option', { name: 'Age' }).click();
  await expect.poll(() => discussionReads().some(({ node }) => node === LITE_NODE)).toBe(true);
  // Asked of A first, which refused it, then of B.
  expect(discussionReads()[0]).toEqual({ node: LITE_LESS_NODE_URL, method: 'lite.get_discussion' });
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate((key) => sessionStorage.getItem(key), AUTO_NODE_KEY)).toBeNull();

  // The next page's core and bridge reads, in the same session.
  calls.length = 0;
  await page.goto(`${baseURL}${LITE_FEED_PATH}`, { waitUntil: 'networkidle' });
  expect(calls).toContainEqual({ node: LITE_LESS_NODE_URL, method: COMMUNITIES_READ });
  expectCallsOnTheirNodes(calls);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), AUTO_NODE_KEY)).toBeNull();
});
