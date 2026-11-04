import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { IncomingHttpHeaders } from 'http';
import type { NextApiRequest } from 'next';

// Under node's type stripping the `@smart-signer/` and `@ui/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@ui/lib/logging': `data:text/javascript,${encodeURIComponent('export const getLogger = () => ({ error() {} });')}`,
  '@smart-signer/lib/same-origin-request': new URL('./same-origin-request.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (MODULES[specifier]) return { url: MODULES[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { checkCsrfHeader, csrfHeaderName } = await import('./csrf-protection.ts');

const SITE = { host: 'denser.example.org' };

function request(headers: IncomingHttpHeaders): NextApiRequest {
  // The check reads only the request's headers
  return { headers } as unknown as NextApiRequest;
}

function statusOf(headers: IncomingHttpHeaders): number {
  try {
    checkCsrfHeader(request(headers));
    return 200;
  } catch (error) {
    return (error as { statusCode: number }).statusCode;
  }
}

describe('checkCsrfHeader', () => {
  it('accepts the header on a same-origin request', () => {
    assert.equal(statusOf({ ...SITE, [csrfHeaderName]: '1', 'sec-fetch-site': 'same-origin' }), 200);
    assert.equal(statusOf({ ...SITE, [csrfHeaderName]: '1', origin: 'https://denser.example.org' }), 200);
  });

  it('accepts a same-origin Origin behind the reverse proxy', () => {
    const headers = {
      host: 'blog:3000',
      'x-forwarded-host': 'denser.example.org',
      origin: 'https://denser.example.org',
      [csrfHeaderName]: '1'
    };
    assert.equal(statusOf(headers), 200);
  });

  it('answers 400 without the header, even from the same origin', () => {
    assert.equal(statusOf({ ...SITE, 'sec-fetch-site': 'same-origin' }), 400);
  });

  it('answers 403 to a cross-site request carrying the header', () => {
    for (const fetchSite of ['cross-site', 'same-site', 'none']) {
      assert.equal(statusOf({ ...SITE, [csrfHeaderName]: '1', 'sec-fetch-site': fetchSite }), 403, fetchSite);
    }
  });

  it('answers 403 to a foreign Origin from a browser without Sec-Fetch-Site', () => {
    assert.equal(statusOf({ ...SITE, [csrfHeaderName]: '1', origin: 'https://evil.example.com' }), 403);
  });

  it('answers 403 when the request names neither Sec-Fetch-Site nor Origin', () => {
    assert.equal(statusOf({ ...SITE, [csrfHeaderName]: '1' }), 403);
  });

  it('trusts Sec-Fetch-Site over a matching Origin', () => {
    const headers = { ...SITE, [csrfHeaderName]: '1', origin: 'https://denser.example.org', 'sec-fetch-site': 'cross-site' };
    assert.equal(statusOf(headers), 403);
  });
});
