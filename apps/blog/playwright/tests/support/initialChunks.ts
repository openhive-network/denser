import type { APIRequestContext } from '@playwright/test';
import { expect } from './fixture-proxy-test';

/**
 * Helpers for asserting what the JS chunks a page loads up front contain. Every chunk the server
 * HTML references is fetched before the page loads; code needed only later (signing, login, the
 * Sentry replay) belongs in chunks loaded through a dynamic `import()`.
 */

const CHUNK_URL_PATTERN = /\/_next\/static\/chunks\/[^"'\s\\]+\.js/g;

/** Strings that only the bundled code of a library carries, keyed by what they identify. */
export const CHUNK_MARKERS = {
  /** Sentry Session Replay */
  rrweb: 'rrweb',
  /** The Sentry SDK: the global carrier every SDK entry point reads, and the SDK name `init` reports */
  sentryCarrier: '__SENTRY__',
  sentrySdkName: 'sentry.javascript.',
  /** hb-auth's key store, bundled with hb-auth */
  beekeeper: 'beekeeper',
  /** wax's JavaScript: its request header and the name of the wasm it loads */
  waxApiCaller: 'x-wax-api-caller',
  waxWasm: 'wax.common.wasm',
  /** @hive/renderer: the label of one of DefaultRenderer's option checks */
  renderer: 'RendererOptions.assetsWidth',
  /** Remarkable, the markdown renderer: one of its token types */
  remarkable: 'footnote_reference_open',
  /** zod: one of its issue codes */
  zod: 'invalid_intersection_types'
} as const;

/** The Sentry SDK: page-load code reaches it only through a dynamic `import()`, made when a DSN is set. */
export const SENTRY_MARKERS = [CHUNK_MARKERS.sentryCarrier, CHUNK_MARKERS.sentrySdkName] as const;

/** What no page an anonymous reader opens may load up front: the signing and login stack. */
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
