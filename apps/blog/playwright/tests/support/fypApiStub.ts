import fs from 'fs';
import path from 'path';
import type { Page, Request } from '@playwright/test';

/**
 * The For You feed's API (haf_fyp) in the fixture suite. The main blog server serves with
 * FYP_API_URL set to FIXTURE_FYP_API_URL, an origin no network answers: the browser reads the feed
 * from it, so a spec answers it with page.route (`serveFypFeed`). The server reads nothing from it.
 */
export const FIXTURE_FYP_API_URL = 'https://fyp.fixture.test/haf-fyp-api';

export const FYP_PAGE_SIZE = 20;

const FEED_ROUTE = `${FIXTURE_FYP_API_URL}/v1/fyp/feed/**`;
const WARM_UP_ROUTE = `${FIXTURE_FYP_API_URL}/v1/fyp/warmup/**`;
// The page reads both APIs cross-origin
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

export interface FypPost {
  author: string;
  permlink: string;
  [field: string]: unknown;
}

/** The posts of a recorded `bridge.get_ranked_posts` response in `fixtureSet`. */
export function recordedRankedPosts(fixtureSet: string, file: string): FypPost[] {
  const recording = path.resolve(__dirname, '..', 'mock', 'fixtures', fixtureSet, file);
  return JSON.parse(fs.readFileSync(recording, 'utf-8')).response.result;
}

/** `posts` as a feed page answers them: each with its `fyp` ranking, ranked from `firstRank`. */
export function asFypPage(posts: FypPost[], firstRank = 1): FypPost[] {
  return posts.map((post, index) => ({
    ...post,
    fyp: {
      rank: firstRank + index,
      source: 'personalized',
      // Larger than Number.MAX_SAFE_INTEGER, as haf_fyp's ids are
      post_id: `477020413881221${String(firstRank + index).padStart(3, '0')}`,
      algorithm_version: '1.1.0',
      final_score: 0.9
    }
  }));
}

/** How a failing For You feed fails: an HTTP status, or no answer at all. */
export type FypFailure = number | 'connectionrefused';

/**
 * Answers the For You feed of `page` with `pages` (page N is `pages[N - 1]`, a missing one empty);
 * a `status` other than 200 fails every request instead. Returns the feed requests the page sent.
 * A later call takes over from an earlier one.
 */
export async function serveFypFeed(
  page: Page,
  pages: FypPost[][],
  status: FypFailure = 200
): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(FEED_ROUTE, (route) => {
    requests.push(route.request());
    if (status === 'connectionrefused') return route.abort('connectionrefused');
    if (status !== 200)
      return route.fulfill({ status, headers: CORS_HEADERS, json: { error: 'unavailable' } });
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
    return route.fulfill({ headers: CORS_HEADERS, json: pages[pageNumber - 1] ?? [] });
  });
  return requests;
}

/** Answers the For You warm-up requests of `page` with 204. Returns the requests the page sent. */
export async function serveFypWarmUp(page: Page): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(WARM_UP_ROUTE, (route) => {
    requests.push(route.request());
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  });
  return requests;
}

/**
 * Answers the browser's `bridge.get_follow_list` reads with `lists` (`follow_type` to account
 * names, the same for every observer), so a spec decides whose posts the reader hides.
 */
export async function serveFollowLists(page: Page, lists: Partial<Record<string, string[]>>): Promise<void> {
  await page.route('http://localhost:8200/**', (route) => {
    const request = route.request();
    let body: { id?: unknown; method?: unknown; params?: { follow_type?: string } } | null = null;
    try {
      body = request.method() === 'POST' ? request.postDataJSON() : null;
    } catch {
      body = null;
    }
    if (body?.method !== 'bridge.get_follow_list') return route.fallback();
    const names = lists[body.params?.follow_type ?? ''] ?? [];
    return route.fulfill({
      headers: CORS_HEADERS,
      json: {
        jsonrpc: '2.0',
        id: body.id,
        result: names.map((name) => ({ name, blacklist_description: '', muted_list_description: '' }))
      }
    });
  });
}

/**
 * Leaves FYP_API_URL unset in the browser of `page`, as on a server without it. The fixture
 * suite's servers serve one `__ENV.js`, which the main server writes with the setting.
 */
export async function unsetFypApiUrlInBrowser(page: Page): Promise<void> {
  await page.route('**/__ENV.js?*', async (route) => {
    const response = await route.fetch();
    const body = `${await response.text()}\nwindow.__ENV.REACT_APP_FYP_API_URL = '';`;
    await route.fulfill({ response, body });
  });
}
