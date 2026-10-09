import type { BrowserContext, Page, Request, Route } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';

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
