import type { BrowserContext, Page, Request, Route } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import type { IFixtureProxyHandle, IJsonRpcCall } from '../support/mock-server';

/**
 * When the browser's selected API node is unreachable, the client switches to a node that answers
 * (one of the allowed nodes, here the fixture proxy) and the page loads its data from it. The
 * switch lasts for the browser session only and never overwrites the node the user chose.
 */

test.use({ fixtureTestName: 'userProfileTabs', bypassCSP: true });

const DEAD_NODE = 'http://localhost:8299';
const HEALTHY_NODE = 'http://localhost:8200';

type TDeadNodeAnswer = (route: Route) => Promise<void>;

const refuseConnection: TDeadNodeAnswer = (route) => route.abort('connectionrefused');
const answerServerError: TDeadNodeAnswer = (route) => route.fulfill({ status: 503, body: 'Service Unavailable' });
/** A black-holed node: the request is never answered, so only the client's own timeout ends it. */
const stall: TDeadNodeAnswer = () => new Promise<void>(() => {});

/** Selects `DEAD_NODE` as the user's explicit node choice and counts the requests it gets. */
const selectDeadNode = async (context: BrowserContext, answer: TDeadNodeAnswer) => {
  const deadNodeRequests: string[] = [];
  await context.addInitScript((node) => {
    window.localStorage.setItem('node-endpoint', JSON.stringify(node));
  }, DEAD_NODE);
  await context.route(`${DEAD_NODE}/**`, (route) => {
    deadNodeRequests.push(route.request().postData() ?? '');
    return answer(route);
  });
  return deadNodeRequests;
};

const FOLLOWERS_READ = 'condenser_api.get_followers';
/** The first follower in the recorded `get_followers` answer. */
const RECORDED_FOLLOWER = 'a-alice';

const isFollowersRead = (request: Request) => (request.postData() ?? '').includes(`"${FOLLOWERS_READ}"`);

/**
 * Opens the followers list, whose page re-reads the list from the browser, and resolves once the
 * healthy node has answered that read and the list shows it.
 */
const openFollowersServedByHealthyNode = async (page: Page) => {
  const healthyRead = page.waitForResponse(
    (response) =>
      response.url().startsWith(HEALTHY_NODE) && isFollowersRead(response.request()) && response.ok()
  );
  await page.goto('/@hiveio/followers');
  await healthyRead;
  await expect(page.getByRole('link', { name: RECORDED_FOLLOWER, exact: true })).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
};

const readNodeStorage = (page: Page) =>
  page.evaluate(() => ({
    selected: window.localStorage.getItem('node-endpoint'),
    automatic: window.sessionStorage.getItem('auto-node-endpoint')
  }));

for (const [variant, answer] of [
  ['refuses connections', refuseConnection],
  ['answers 503', answerServerError]
] as const) {
  test(`API-FAILOVER-01: a selected node that ${variant} is replaced for the session`, async ({
    context,
    page
  }) => {
    const deadNodeRequests = await selectDeadNode(context, answer);

    await openFollowersServedByHealthyNode(page);

    expect(deadNodeRequests.some((body) => body.includes(FOLLOWERS_READ))).toBe(true);
    expect(await readNodeStorage(page)).toEqual({
      selected: JSON.stringify(DEAD_NODE),
      automatic: JSON.stringify({ replaced: DEAD_NODE, node: HEALTHY_NODE })
    });

    // Later reads in the same session go straight to the node that answered.
    const requestsBeforeReload = deadNodeRequests.length;
    await openFollowersServedByHealthyNode(page);
    expect(deadNodeRequests).toHaveLength(requestsBeforeReload);
  });
}

test('API-FAILOVER-02: a new session starts on the selected node again', async ({ context, page }) => {
  const deadNodeRequests = await selectDeadNode(context, refuseConnection);
  await openFollowersServedByHealthyNode(page);

  // A new tab has its own sessionStorage, as a new browser session would; localStorage is shared.
  const nextSession = await context.newPage();
  const requestsBeforeNextSession = deadNodeRequests.length;

  await openFollowersServedByHealthyNode(nextSession);

  expect(deadNodeRequests.length).toBeGreaterThan(requestsBeforeNextSession);
  expect(await readNodeStorage(nextSession)).toEqual({
    selected: JSON.stringify(DEAD_NODE),
    automatic: JSON.stringify({ replaced: DEAD_NODE, node: HEALTHY_NODE })
  });
});

/** The browser's request timeout of the selected node (`apiTimeout`): a failover must not wait it out. */
const SELECTED_NODE_TIMEOUT_MS = 5_000;

const SWITCHED_TO_HEALTHY_NODE = {
  selected: JSON.stringify(DEAD_NODE),
  automatic: JSON.stringify({ replaced: DEAD_NODE, node: HEALTHY_NODE })
};

const COMMUNITIES_READ = 'bridge.list_communities';
const isRepliesRead = ({ method, params }: IJsonRpcCall) =>
  method === 'bridge.get_account_posts' && params.sort === 'replies';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseJsonRpcCall = (body: string | null): IJsonRpcCall | undefined => {
  try {
    const call: unknown = JSON.parse(body ?? '');
    return isRecord(call) && typeof call.method === 'string' && isRecord(call.params)
      ? { method: call.method, params: call.params }
      : undefined;
  } catch {
    return undefined;
  }
};

/** Whether a JSON-RPC request body is a call matching `isRead`. */
const isReadBody = (body: string | null, isRead: (call: IJsonRpcCall) => boolean): boolean => {
  const call = parseJsonRpcCall(body);
  return !!call && isRead(call);
};

const isApiNodeRequest = (url: URL) => url.origin === DEAD_NODE || url.origin === HEALTHY_NODE;

/**
 * Fails the server's reads matching `isRead`, so the page reads them again from the browser; from
 * the browser's first such request on, the reads are served again. Returns `restore`.
 */
const failServerReads = async (
  context: BrowserContext,
  fixtureProxy: IFixtureProxyHandle,
  isRead: (call: IJsonRpcCall) => boolean
) => {
  let browserAsked = false;
  const restoreProxy = fixtureProxy.failRequests((call) => !browserAsked && isRead(call));
  const markBrowserRead = (route: Route) => {
    if (isReadBody(route.request().postData(), isRead)) browserAsked = true;
    return route.fallback();
  };
  await context.route(isApiNodeRequest, markBrowserRead);
  return async () => {
    restoreProxy();
    await context.unroute(isApiNodeRequest, markBrowserRead);
  };
};

const waitForHealthyRead = (page: Page, isRead: (call: IJsonRpcCall) => boolean) =>
  page.waitForResponse(
    (response) =>
      response.url().startsWith(HEALTHY_NODE) &&
      isReadBody(response.request().postData(), isRead) &&
      response.ok()
  );

const expectRepliesListed = (page: Page) =>
  expect(page.getByTestId('post-list-profile-blog-list').first()).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });

test('API-FAILOVER-03: after a switch, a client-side navigation reads from the new node only', async ({
  context,
  page,
  fixtureProxy
}) => {
  const deadNodeRequests = await selectDeadNode(context, stall);

  // The sidebar's communities are read by the browser, which fails over and switches.
  const restoreCommunities = await failServerReads(
    context,
    fixtureProxy,
    ({ method }) => method === COMMUNITIES_READ
  );
  const communitiesRead = waitForHealthyRead(page, ({ method }) => method === COMMUNITIES_READ);
  await page.goto('/trending');
  await communitiesRead;
  await restoreCommunities();
  await expect.poll(() => readNodeStorage(page)).toEqual(SWITCHED_TO_HEALTHY_NODE);

  const requestsBeforeNavigation = deadNodeRequests.length;
  const restoreReplies = await failServerReads(context, fixtureProxy, isRepliesRead);
  try {
    const repliesRead = waitForHealthyRead(page, isRepliesRead);
    await page.evaluate(() => {
      // App Router exposes its router on `window.next` in every build; a soft navigation keeps the
      // page's JavaScript state, including the switch and the node health it learned.
      (window as Window & { next?: { router?: { push: (href: string) => void } } }).next?.router?.push(
        '/@hiveio/replies'
      );
    });
    await repliesRead;
  } finally {
    await restoreReplies();
  }

  await expectRepliesListed(page);
  expect(deadNodeRequests).toHaveLength(requestsBeforeNavigation);
});

test('API-FAILOVER-04: a client-side navigation first in a session fails over within one request timeout', async ({
  context,
  page,
  fixtureProxy
}) => {
  const deadNodeRequests = await selectDeadNode(context, stall);
  await page.goto('/@hiveio');
  await expect(page.getByRole('link', { name: 'Replies', exact: true })).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
  expect(deadNodeRequests).toHaveLength(0);

  const restoreReplies = await failServerReads(context, fixtureProxy, isRepliesRead);
  try {
    const deadNodeAskedAt = page
      .waitForRequest(
        (request) => request.url().startsWith(DEAD_NODE) && isReadBody(request.postData(), isRepliesRead)
      )
      .then(() => Date.now());
    const servedAt = waitForHealthyRead(page, isRepliesRead).then(() => Date.now());
    await page.getByRole('link', { name: 'Replies', exact: true }).click();

    expect((await servedAt) - (await deadNodeAskedAt)).toBeLessThan(SELECTED_NODE_TIMEOUT_MS);
  } finally {
    await restoreReplies();
  }

  await expectRepliesListed(page);
  await expect.poll(() => readNodeStorage(page)).toEqual(SWITCHED_TO_HEALTHY_NODE);
});
