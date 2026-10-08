import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Helpers for asserting what the JS chunks a page loads up front contain. Every chunk the server
 * HTML references is fetched before the page loads; code needed only later (signing, login, wax's
 * formatter) belongs in chunks loaded through a dynamic `import()`.
 *
 * The wallet's copy of apps/blog/playwright/tests/support/initialChunks.ts: each app's Playwright
 * code is compiled on its own, against its own app's path aliases.
 */

const CHUNK_URL_PATTERN = /(?:\/[\w-]+)*\/_next\/static\/chunks\/[^"'\s\\]+\.js/g;

/** Strings that only the bundled code of a library carries, keyed by what they identify. */
export const CHUNK_MARKERS = {
  /** The Sentry SDK: the global carrier every SDK entry point reads, and the SDK name `init` reports */
  sentryCarrier: '__SENTRY__',
  sentrySdkName: 'sentry.javascript.',
  /** hb-auth's key store, bundled with hb-auth */
  beekeeper: 'beekeeper',
  /** wax's JavaScript: its request header and the name of the wasm it loads */
  waxApiCaller: 'x-wax-api-caller',
  waxWasm: 'wax.common.wasm',
  /** recharts: the class of the element every chart renders into */
  recharts: 'recharts-wrapper'
} as const;

/** The Sentry SDK: page-load code reaches it only through a dynamic `import()`, made when a DSN is set. */
export const SENTRY_MARKERS = [CHUNK_MARKERS.sentryCarrier, CHUNK_MARKERS.sentrySdkName] as const;

/** What no page may load up front: wax and the signing and login stack. */
export const SIGNING_STACK_MARKERS = [
  CHUNK_MARKERS.beekeeper,
  CHUNK_MARKERS.waxApiCaller,
  CHUNK_MARKERS.waxWasm
] as const;

/**
 * Fetches the server HTML of `path` and every chunk it references; returns `"<chunk url>: <marker>"`
 * for each marker found in a chunk.
 */
export const findMarkersInInitialChunks = async (
  request: APIRequestContext,
  path: string,
  markers: readonly string[]
): Promise<string[]> => {
  const pageResponse = await request.get(path);
  expect(pageResponse.status(), path).toBe(200);
  const html = await pageResponse.text();

  const chunkUrls = [...new Set(html.match(CHUNK_URL_PATTERN) ?? [])];
  expect(chunkUrls.length, path).toBeGreaterThan(0);

  const found: string[] = [];
  for (const chunkUrl of chunkUrls) {
    const chunkResponse = await request.get(chunkUrl);
    expect(chunkResponse.status(), chunkUrl).toBe(200);
    const chunk = await chunkResponse.text();
    for (const marker of markers) {
      if (chunk.includes(marker)) found.push(`${chunkUrl}: ${marker}`);
    }
  }
  return found;
};
