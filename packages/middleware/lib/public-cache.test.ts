import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import {
  installPublicCacheGuard,
  isPublicCacheableRequest,
  NO_STORE_CACHE_CONTROL,
  publicCacheControl,
  readPublicCacheConfig,
  type PageRequest
} from './public-cache.ts';

const PUBLIC = 'public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300';

const anonymousPage = (overrides: Partial<PageRequest> = {}): PageRequest => ({
  method: 'GET',
  pathname: '/trending',
  searchParams: new URLSearchParams(),
  headers: new Headers({ accept: 'text/html' }),
  cookieNames: [],
  ...overrides
});

describe('isPublicCacheableRequest', () => {
  test('a GET or HEAD of a page without cookies is cacheable', () => {
    assert.equal(isPublicCacheableRequest(anonymousPage()), true);
    assert.equal(isPublicCacheableRequest(anonymousPage({ method: 'HEAD' })), true);
    assert.equal(isPublicCacheableRequest(anonymousPage({ pathname: '/' })), true);
  });

  test('cookies that do not change the render keep it cacheable', () => {
    for (const name of ['blog_login_challenge_server', 'session_uid', '_ga']) {
      assert.equal(isPublicCacheableRequest(anonymousPage({ cookieNames: [name] })), true, name);
    }
  });

  test('any one personalizing cookie makes it not cacheable', () => {
    for (const name of [
      'blog_session',
      'wallet_session',
      '_session',
      '_session.legacy',
      'observer',
      'observer-no-own-lists',
      'account_info',
      'NEXT_LOCALE'
    ]) {
      assert.equal(isPublicCacheableRequest(anonymousPage({ cookieNames: ['session_uid', name] })), false, name);
    }
  });

  test('other methods are not cacheable', () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      assert.equal(isPublicCacheableRequest(anonymousPage({ method })), false, method);
    }
  });

  test('client router requests are not cacheable', () => {
    for (const header of ['RSC', 'Next-Router-Prefetch', 'Next-Router-State-Tree', 'Next-Router-Segment-Prefetch']) {
      const headers = new Headers({ [header]: '1' });
      assert.equal(isPublicCacheableRequest(anonymousPage({ headers })), false, header);
    }
    const searchParams = new URLSearchParams({ _rsc: 'abc12' });
    assert.equal(isPublicCacheableRequest(anonymousPage({ searchParams })), false, '_rsc query');
  });

  test('API routes and Next internals are not cacheable', () => {
    for (const pathname of ['/api', '/api/auth/challenge', '/api/users/me', '/_next/data/x.json']) {
      assert.equal(isPublicCacheableRequest(anonymousPage({ pathname })), false, pathname);
    }
    // An account named like the API prefix is a page
    assert.equal(isPublicCacheableRequest(anonymousPage({ pathname: '/apix' })), true);
  });
});

describe('readPublicCacheConfig', () => {
  test('defaults to 30 s fresh, 60 s stale while revalidating, 300 s stale on error', () => {
    assert.equal(publicCacheControl(readPublicCacheConfig({})), PUBLIC);
  });

  test('reads each lifetime from its setting', () => {
    const config = readPublicCacheConfig({
      DENSER_PUBLIC_CACHE_S_MAXAGE_S: '10',
      DENSER_PUBLIC_CACHE_STALE_WHILE_REVALIDATE_S: '20',
      DENSER_PUBLIC_CACHE_STALE_IF_ERROR_S: '0'
    });
    assert.equal(publicCacheControl(config), 'public, s-maxage=10, stale-while-revalidate=20, stale-if-error=0');
  });

  test('falls back to the default for values that are not whole non-negative seconds', () => {
    for (const value of ['-1', '1.5', 'soon', ' ']) {
      assert.equal(readPublicCacheConfig({ DENSER_PUBLIC_CACHE_S_MAXAGE_S: value }).sMaxAgeS, 30, value);
    }
    assert.equal(readPublicCacheConfig({ DENSER_PUBLIC_CACHE_S_MAXAGE_S: '0' }).sMaxAgeS, 0);
  });
});

describe('installPublicCacheGuard', () => {
  class GuardedResponse extends ServerResponse {}
  installPublicCacheGuard(GuardedResponse);

  const response = (cacheControl?: string, url = '/trending', headers: Record<string, string> = {}): ServerResponse => {
    const req = new IncomingMessage(new Socket());
    req.url = url;
    req.headers = headers;
    const res = new GuardedResponse(req);
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);
    return res;
  };

  test('a public 200 without cookies stays public', () => {
    const res = response(PUBLIC);
    res.writeHead(200);
    assert.equal(res.getHeader('cache-control'), PUBLIC);
  });

  test('a public response with another status is sent as no-store', () => {
    for (const status of [404, 307, 500, 503, 304]) {
      const res = response(PUBLIC);
      res.writeHead(status);
      assert.equal(res.getHeader('cache-control'), NO_STORE_CACHE_CONTROL, String(status));
    }
  });

  test('a status set before the implicit header write is checked too', () => {
    const res = response(PUBLIC);
    res.statusCode = 404;
    res.end();
    assert.equal(res.getHeader('cache-control'), NO_STORE_CACHE_CONTROL);
  });

  test('a public response that sets a cookie is sent as no-store', () => {
    const res = response(PUBLIC);
    res.setHeader('Set-Cookie', ['blog_session=x; Path=/']);
    res.writeHead(200);
    assert.equal(res.getHeader('cache-control'), NO_STORE_CACHE_CONTROL);

    const viaWriteHead = response(PUBLIC);
    viaWriteHead.writeHead(200, 'OK', { 'Set-Cookie': 'a=b' });
    assert.equal(viaWriteHead.getHeader('cache-control'), NO_STORE_CACHE_CONTROL);
  });

  test('a public Cache-Control passed to writeHead is replaced as well', () => {
    const res = response();
    res.writeHead(404, { 'Cache-Control': PUBLIC });
    assert.equal(res.getHeader('cache-control'), NO_STORE_CACHE_CONTROL);
  });

  test('a client router request is sent as no-store, the _rsc query too', () => {
    for (const [url, headers] of [
      ['/trending?_rsc=abc12', {}],
      ['/trending', { rsc: '1' }]
    ] as const) {
      const res = response(PUBLIC, url, headers);
      res.writeHead(200);
      assert.equal(res.getHeader('cache-control'), NO_STORE_CACHE_CONTROL, url);
    }
  });

  test('static files sent public by Next keep their Cache-Control, a 304 too', () => {
    const immutable = 'public, max-age=31536000, immutable';
    const res = response(immutable);
    res.writeHead(304);
    assert.equal(res.getHeader('cache-control'), immutable);
  });

  test('responses that are not public are left alone', () => {
    const res = response('private, max-age=60');
    res.setHeader('Set-Cookie', 'a=b');
    res.writeHead(404);
    assert.equal(res.getHeader('cache-control'), 'private, max-age=60');
    const none = response();
    none.writeHead(500);
    assert.equal(none.getHeader('cache-control'), undefined);
  });
});
