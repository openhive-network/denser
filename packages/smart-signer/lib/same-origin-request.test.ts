import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSameOriginRequest } from './same-origin-request.ts';

describe('isSameOriginRequest without Sec-Fetch-Site', () => {
  it('accepts an Origin on a non-default port the proxy names in X-Forwarded-Port', () => {
    assert.equal(isSameOriginRequest({ host: 'h', 'x-forwarded-port': '8080', origin: 'http://h:8080' }), true);
    const proxied = {
      host: 'blog:3000',
      'x-forwarded-host': 'h',
      'x-forwarded-port': '8080',
      'x-forwarded-proto': 'http',
      origin: 'http://h:8080'
    };
    assert.equal(isSameOriginRequest(proxied), true);
  });

  it('accepts an Origin on the port the forwarded Host carries', () => {
    assert.equal(isSameOriginRequest({ host: 'h:8080', origin: 'http://h:8080' }), true);
    assert.equal(isSameOriginRequest({ host: 'H:8080', 'x-forwarded-port': '3000', origin: 'http://h:8080' }), true);
  });

  it('accepts an Origin on the default port when Next fills X-Forwarded-Port with its own port', () => {
    const headers = { host: 'h', 'x-forwarded-port': '3000', 'x-forwarded-proto': 'https', origin: 'https://h' };
    assert.equal(isSameOriginRequest(headers), true);
    assert.equal(isSameOriginRequest({ host: 'h', origin: 'https://h' }), true);
  });

  it('refuses an Origin naming another host', () => {
    assert.equal(isSameOriginRequest({ host: 'h', 'x-forwarded-port': '8080', origin: 'http://evil:8080' }), false);
    assert.equal(isSameOriginRequest({ host: 'h', 'x-forwarded-host': 'evil', origin: 'http://h' }), false);
  });

  it('refuses an Origin on another port of the host', () => {
    assert.equal(isSameOriginRequest({ host: 'h', 'x-forwarded-port': '8080', origin: 'http://h:9090' }), false);
    assert.equal(isSameOriginRequest({ host: 'h:8080', 'x-forwarded-port': '9090', origin: 'http://h:9090' }), false);
    assert.equal(isSameOriginRequest({ host: 'h:8080', origin: 'http://h' }), false);
  });

  it('refuses an Origin on another scheme of the host', () => {
    const headers = { host: 'h:8080', 'x-forwarded-proto': 'http', origin: 'https://h:8080' };
    assert.equal(isSameOriginRequest(headers), false);
    assert.equal(isSameOriginRequest({ host: 'h', 'x-forwarded-proto': 'https', origin: 'http://h' }), false);
  });

  it('refuses a missing, opaque or malformed Origin or Host', () => {
    assert.equal(isSameOriginRequest({ host: 'h' }), false);
    assert.equal(isSameOriginRequest({ host: 'h', origin: 'null' }), false);
    assert.equal(isSameOriginRequest({ origin: 'http://h' }), false);
    assert.equal(isSameOriginRequest({ host: 'evil@h', origin: 'http://h' }), false);
  });

  it('trusts Sec-Fetch-Site over the Origin', () => {
    assert.equal(isSameOriginRequest({ host: 'h', origin: 'http://h', 'sec-fetch-site': 'cross-site' }), false);
    assert.equal(isSameOriginRequest({ host: 'h', 'sec-fetch-site': 'same-origin' }), true);
  });
});
