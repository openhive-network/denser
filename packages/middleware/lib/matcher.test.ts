// Checks each app's middleware matcher (apps/*/proxy.ts) with Next's own matching, under the
// base path the integration site and haf_api_node serve the apps at, and at the root.
// The matcher must cover the bare base path: the blog serves its home page by rewriting `/`,
// and a matcher that only matched `/blog/` left `/blog` a 404 (the bug this guards against).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';

// Next's testing helpers expect the edge runtime's global.
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
const require = createRequire(import.meta.url);
const { unstable_doesMiddlewareMatch: doesMatch } = require('next/experimental/testing/server');

/** The `config.matcher` strings of an app's proxy.ts (Next requires them to be literals there). */
function matcherOf(app: string): string[] {
  const source = readFileSync(new URL(`../../../apps/${app}/proxy.ts`, import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('export const config'));
  const list = block.slice(block.indexOf('matcher: ['), block.indexOf(']\n};'));
  const code = list.replace(/\/\/.*$/gm, ''); // drop comments: they may contain quotes
  const literals = [...code.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(([, s]) => JSON.parse(`"${s.replace(/"/g, '\\"')}"`));
  assert.ok(literals.length > 0, `no matcher literals found in apps/${app}/proxy.ts`);
  return literals;
}

for (const app of ['blog', 'wallet']) {
  const config = { matcher: matcherOf(app) };
  for (const basePath of [`/${app}`, '']) {
    const match = (path: string) => doesMatch({ config, url: `${basePath}${path}`, nextConfig: { basePath } });
    const where = basePath ? `under ${basePath}` : 'at the root';

    test(`${app} middleware runs on the app's root ${where}`, () => {
      assert.equal(match(''), true, `${basePath || '/'} (no trailing slash)`);
      assert.equal(match('/'), true, `${basePath}/`);
    });

    test(`${app} middleware runs on pages ${where}`, () => {
      for (const path of ['/trending', '/@gtg', '/@some.user', '/@gtg/transfers', '/hive-160391/@gtg/a-post']) {
        assert.equal(match(path), true, path);
      }
    });

    test(`${app} middleware skips build assets and public files ${where}`, () => {
      for (const path of ['/_next/static/chunks/a.js', '/_next/static/media/wax.common.x.wasm', '/_next/image', '/favicon.ico', '/locales/en/common_blog.json']) {
        assert.equal(match(path), false, path);
      }
    });
  }
}
