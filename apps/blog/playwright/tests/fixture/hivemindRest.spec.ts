import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { startHivemindRestStub, type IHivemindRestStub } from '../support/hivemindRestStub';

/**
 * Feeds, profiles, communities and search read from hivemind REST GETs (HIVEMIND_REST_NODES).
 * The suite's third blog server names the hivemind REST stub (support/hivemindRestStub.ts), which
 * answers each REST path from the JSON-RPC recording it wraps; the main server leaves the setting
 * empty. Each page must render the same on both, from REST requests the stub served, and the main
 * server must make no REST request at all. Server HTML only (JavaScript off), so only the servers'
 * reads reach the stub.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- hivemindRest
 */

test.use({ fixtureTestName: 'ssrChecks', javaScriptEnabled: false });
test.describe.configure({ mode: 'serial' });

const USER = 'guest4test1';
const COMMUNITY = 'hive-160391';

interface IRenderedPage {
  posts: string[][];
  text: string[];
}

/** What a page shows: author, title and payout of each post card, and the texts of `textTestIds`. */
async function renderedPage(page: Page, url: string, textTestIds: string[] = []): Promise<IRenderedPage> {
  const response = await page.goto(url);
  expect(response?.status(), url).toBe(200);
  const posts = await page.getByTestId('post-list-item').evaluateAll((items) =>
    items.map((item) =>
      ['post-author', 'post-title', 'post-payout'].map(
        (testId) => item.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? ''
      )
    )
  );
  const text = await Promise.all(textTestIds.map((testId) => page.getByTestId(testId).first().innerText()));
  return { posts, text };
}

let stub: IHivemindRestStub | undefined;
let restBaseURL = '';

test.beforeAll(async ({ hivemindRestBaseURL, fixtureProxy: _fixtureProxy, fixturePort }) => {
  if (!hivemindRestBaseURL) return;
  restBaseURL = hivemindRestBaseURL;
  stub = await startHivemindRestStub(`http://localhost:${fixturePort}`);
});

test.afterAll(async () => {
  await stub?.close();
});

test.beforeEach(({ hivemindRestBaseURL }) => {
  test.skip(!hivemindRestBaseURL, 'no blog serves with HIVEMIND_REST_NODES set');
  if (stub) stub.requests.length = 0;
});

const servedRestRequests = () => stub?.requests.filter(({ status }) => status === 200).map(({ url }) => url) ?? [];

test.describe('anonymous', () => {
  test('HIVEMIND-REST-01 — trending renders the same from /posts as from JSON-RPC', async ({ page }) => {
    const overJsonRpc = await renderedPage(page, '/trending');
    expect(stub?.requests, 'the server without HIVEMIND_REST_NODES makes no REST request').toEqual([]);

    const overRest = await renderedPage(page, `${restBaseURL}/trending`);

    expect(overJsonRpc.posts.length).toBeGreaterThan(0);
    expect(overRest).toEqual(overJsonRpc);
    expect(servedRestRequests()).toContain('/hivemind-api/posts?sort=trending&observer=hive.blog&page-size=20');
    expect(servedRestRequests()).toContain('/hivemind-api/communities?sort=rank&observer=hive.blog');
  });

  test("HIVEMIND-REST-02 — a profile's posts render the same from /accounts/{name}/posts", async ({ page }) => {
    const overJsonRpc = await renderedPage(page, `/@${USER}`, ['profile-name']);
    const overRest = await renderedPage(page, `${restBaseURL}/@${USER}`, ['profile-name']);

    expect(overJsonRpc.posts.length).toBeGreaterThan(0);
    expect(overRest).toEqual(overJsonRpc);
    expect(servedRestRequests()).toEqual(
      expect.arrayContaining([
        `/hivemind-api/accounts/${USER}/posts?sort=blog&observer=hive.blog&page-size=20`,
        `/hivemind-api/accounts/${USER}/profile`
      ])
    );
  });

  test('HIVEMIND-REST-03 — search results render the same from /search/posts', async ({ page }) => {
    const overJsonRpc = await renderedPage(page, '/search?q=hive&s=relevance');
    const overRest = await renderedPage(page, `${restBaseURL}/search?q=hive&s=relevance`);

    expect(overJsonRpc.posts.length).toBeGreaterThan(0);
    expect(overRest).toEqual(overJsonRpc);
    expect(servedRestRequests()).toContain(
      '/hivemind-api/search/posts?q=hive&sort=relevance&observer=hive.blog&page-size=20'
    );
  });
});

test.describe('signed in', () => {
  test.use({ authenticatedUser: { username: USER } });

  test('HIVEMIND-REST-04 — a community page renders the same from /communities/{name} and /posts', async ({
    page
  }) => {
    const overJsonRpc = await renderedPage(page, `/trending/${COMMUNITY}`, ['community-info-sidebar']);
    const overRest = await renderedPage(page, `${restBaseURL}/trending/${COMMUNITY}`, ['community-info-sidebar']);

    expect(overJsonRpc.posts.length).toBeGreaterThan(0);
    expect(overRest).toEqual(overJsonRpc);
    expect(servedRestRequests()).toEqual(
      expect.arrayContaining([
        `/hivemind-api/communities/${COMMUNITY}?observer=${USER}`,
        `/hivemind-api/posts?sort=trending&tag=${COMMUNITY}&observer=${USER}&page-size=20`
      ])
    );
  });
});
