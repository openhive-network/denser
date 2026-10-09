import type { Page, Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { gotoLoggedIn } from '../support/postDisplayContext';

/**
 * Which observer the feed reads of a logged-in user send.
 *
 * An account without mute or blacklist lists of its own (no mutes, no
 * blacklist, no followed lists) reads feeds, posts and search as the default
 * observer `hive.blog`, sharing the anonymous cache; community and
 * subscription reads keep its username. Any account with lists sends its
 * username everywhere.
 *
 * Fixtures: the logged-in trending feed (`loggedInHomeFeeds`, observer
 * guest4test) plus the anonymous one (copied from `homepage`, observer
 * hive.blog). The two recordings start with different posts, so the rendered
 * feed shows which observer the server read sent.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- observerDefault
 */

const USERNAME = 'guest4test';
const DEFAULT_OBSERVER = 'hive.blog';
const ANONYMOUS_FEED_POST = 'sam.hangout/sams-hangout-week-108-summaryhighlights';
const USER_FEED_POST = 'mantequilla-soft/mantequilla-soft-weekly-progress-report--mpbrnf74';
const NO_OWN_LISTS_COOKIE = 'observer-no-own-lists';

interface IRpcCall {
  method: string;
  params: Record<string, unknown>;
}

function rpcCall(request: Request): IRpcCall | null {
  if (request.method() !== 'POST' || !request.url().startsWith('http://localhost:8200')) return null;
  try {
    const body = request.postDataJSON();
    return typeof body?.method === 'string' ? { method: body.method, params: body.params ?? {} } : null;
  } catch {
    return null;
  }
}

/** Collects the JSON-RPC calls the page sends to the API. */
function recordRpcCalls(page: Page): IRpcCall[] {
  const calls: IRpcCall[] = [];
  page.on('request', (request) => {
    const call = rpcCall(request);
    if (call) calls.push(call);
  });
  return calls;
}

const observersOf = (calls: IRpcCall[], method: string) =>
  calls.filter((call) => call.method === method).map((call) => call.params.observer);

const postLink = (page: Page, post: string) =>
  page.locator(`li[data-testid="post-list-item"] a[href*="${post.split('/')[1]}"]`).first();

test.use({ fixtureTestName: 'observerDefault', authenticatedUser: {} });

test.describe('account without lists of its own', () => {
  test.use({ authenticatedUserHasOwnLists: false });

  test('OBSERVER-01 — the server reads the feed as the default observer', async ({ page }) => {
    const calls = recordRpcCalls(page);
    await gotoLoggedIn(page, '/trending');

    await expect(postLink(page, ANONYMOUS_FEED_POST)).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(postLink(page, USER_FEED_POST)).toHaveCount(0);
    await expect(new HomePage(page).getMainTimeLineOfPosts.first()).toBeVisible();

    expect(observersOf(calls, 'bridge.get_ranked_posts').filter((o) => o !== DEFAULT_OBSERVER)).toEqual([]);
    expect(observersOf(calls, 'bridge.list_communities').filter((o) => o !== USERNAME)).toEqual([]);
    // The stored answer is fresh: no check request.
    expect(observersOf(calls, 'bridge.does_user_follow_any_lists')).toEqual([]);
  });

  test('OBSERVER-02 — the client reads the feed as the default observer', async ({ page, context }) => {
    // Without the cookie the server reads as the username; the client then refetches as hive.blog.
    await context.clearCookies({ name: NO_OWN_LISTS_COOKIE });
    const calls = recordRpcCalls(page);
    const feedRequest = page.waitForRequest((request) => {
      const call = rpcCall(request);
      return call?.method === 'bridge.get_ranked_posts' && call.params.sort === 'trending';
    });
    await gotoLoggedIn(page, '/trending');

    expect(rpcCall(await feedRequest)?.params.observer).toBe(DEFAULT_OBSERVER);
    await expect(postLink(page, ANONYMOUS_FEED_POST)).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    expect(observersOf(calls, 'bridge.get_ranked_posts').filter((o) => o !== DEFAULT_OBSERVER)).toEqual([]);
    expect(observersOf(calls, 'bridge.list_communities').filter((o) => o !== USERNAME)).toEqual([]);
  });
});

test.describe('account with lists of its own', () => {
  test('OBSERVER-03 — every feed read sends the username', async ({ page }) => {
    const calls = recordRpcCalls(page);
    await gotoLoggedIn(page, '/trending');

    await expect(postLink(page, USER_FEED_POST)).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(postLink(page, ANONYMOUS_FEED_POST)).toHaveCount(0);

    expect(observersOf(calls, 'bridge.get_ranked_posts').filter((o) => o !== USERNAME)).toEqual([]);
    expect(observersOf(calls, 'bridge.list_communities').filter((o) => o !== USERNAME)).toEqual([]);
  });
});
