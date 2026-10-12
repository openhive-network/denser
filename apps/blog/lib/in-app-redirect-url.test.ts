import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { inAppRedirectUrl } = await import('./in-app-redirect-url.ts');

const POST_PATH = '/hive-139531/@hivebuzz/notify-1791766598';
const PROXY_HEADERS = new Headers({ host: 'newblog', 'x-forwarded-proto': 'http' });

describe('inAppRedirectUrl', () => {
  it('keeps a root deployment at the root of the configured site', () => {
    const url = inAppRedirectUrl(
      POST_PATH,
      { siteDomain: 'https://hive.blog', production: true },
      PROXY_HEADERS
    );
    assert.equal(url.toString(), `https://hive.blog${POST_PATH}`);
  });

  it('puts the path under the base path', () => {
    for (const basePath of ['/blog', '/blog/', '/apps/denser']) {
      const url = inAppRedirectUrl(
        POST_PATH,
        { siteDomain: 'https://denser.example.com', basePath, production: true },
        PROXY_HEADERS
      );
      assert.equal(url.toString(), `https://denser.example.com${basePath.replace(/\/$/, '')}${POST_PATH}`);
    }
  });

  it('does not repeat a base path the site domain already carries', () => {
    const url = inAppRedirectUrl(
      POST_PATH,
      { siteDomain: 'https://denser.example.com/blog', basePath: '/blog', production: true },
      PROXY_HEADERS
    );
    assert.equal(url.toString(), `https://denser.example.com/blog${POST_PATH}`);
  });

  it('keeps the not-found page under the base path', () => {
    const config = { siteDomain: 'https://denser.example.com/blog', production: true };
    assert.equal(
      inAppRedirectUrl('/404', { ...config, basePath: '/blog' }, PROXY_HEADERS).toString(),
      'https://denser.example.com/blog/404'
    );
    assert.equal(
      inAppRedirectUrl('/404', config, PROXY_HEADERS).toString(),
      'https://denser.example.com/404'
    );
  });

  it('ignores the Host header when a site domain is configured', () => {
    const url = inAppRedirectUrl(
      POST_PATH,
      { siteDomain: 'https://hive.blog', production: true },
      new Headers({ host: 'evil.example.com', 'x-forwarded-proto': 'https' })
    );
    assert.equal(url.origin, 'https://hive.blog');
  });

  it('falls back to the request host only without a valid site domain', () => {
    for (const siteDomain of [undefined, '', 'not a url']) {
      const url = inAppRedirectUrl(
        POST_PATH,
        { siteDomain, basePath: '/blog', production: false },
        new Headers({ host: 'localhost:3000' })
      );
      assert.equal(url.toString(), `http://localhost:3000/blog${POST_PATH}`);
    }
  });
});
