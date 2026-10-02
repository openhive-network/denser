/**
 * The blog's fixture suite (apps/blog/playwright.fixture.config.ts) against a
 * blog someone else serves — AIDEV's dev stack (.aidev/dev-stack-spec.sh) or
 * test stack (.aidev/run-fixture-e2e.sh) — instead of the standalone server the
 * base config's webServer starts. Everything else (tests, timeouts, retries,
 * projects, the app's env contract) is the base config's.
 *
 *   DENSER_BLOG_URL             the blog, default http://localhost:3000. Keep the
 *                               host `localhost`: the auth seeder's cookie is
 *                               scoped to it.
 *   DENSER_FIXTURE_WORKER_PORT  where each Playwright worker starts the spec's own
 *                               fixture proxy, default 8200. The browser always
 *                               calls http://localhost:8200 (the app's
 *                               REACT_APP_API_ENDPOINT, and what the broadcast
 *                               interceptor matches).
 *   DENSER_FEED_CACHE_BLOG_URL  a blog serving with the feed cache on, as the base
 *                               config's second webServer does; unset skips
 *                               feedCache.spec.ts.
 *   DENSER_PLAYWRIGHT_OUTPUT_DIR traces and screenshots, default apps/blog/test-results.
 *                               Against `next dev` keep it outside apps/ and
 *                               packages/: tailwind's content globs make next
 *                               watch those trees, so every trace written there
 *                               triggers a recompile mid-test.
 *
 * Run from apps/blog with --tsconfig=tsconfig.json so the specs' path aliases
 * resolve as they do under the base config.
 */
import path from 'path';
import base from '../apps/blog/playwright.fixture.config';

const blogDir = path.resolve(__dirname, '../apps/blog');

export default {
  ...base,
  testDir: path.join(blogDir, 'playwright/tests/fixture'),
  outputDir: process.env.DENSER_PLAYWRIGHT_OUTPUT_DIR || path.join(blogDir, 'test-results'),
  webServer: undefined,
  use: {
    ...base.use,
    baseURL: process.env.DENSER_BLOG_URL || 'http://localhost:3000',
    fixturePort: Number(process.env.DENSER_FIXTURE_WORKER_PORT || 8200),
    feedCacheBaseURL: process.env.DENSER_FEED_CACHE_BLOG_URL
  }
};
