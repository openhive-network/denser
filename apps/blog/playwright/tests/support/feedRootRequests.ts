import type { Page } from '@playwright/test';

/**
 * Paths that serve a full feed: `/` (the trending feed, via the root rewrite) and `/trending`, the
 * targets of the header's logo and "Posts" links.
 */
const FEED_ROOT_PATHS = new Set(['/', '/trending']);

/**
 * Records every request `page` makes to a feed root on the app's own origin — documents, RSC
 * navigations and RSC prefetches alike; returns the (live) list of their URLs. Requests to other
 * origins (the Hive API proxy also answers at `/`) are ignored.
 */
export const recordFeedRootRequests = (page: Page, baseURL: string): string[] => {
  const appOrigin = new URL(baseURL).origin;
  const feedRootRequests: string[] = [];
  page.context().on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === appOrigin && FEED_ROOT_PATHS.has(url.pathname)) feedRootRequests.push(request.url());
  });
  return feedRootRequests;
};
