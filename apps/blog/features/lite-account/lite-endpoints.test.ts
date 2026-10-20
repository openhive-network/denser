import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const { liteGatewayEndpoint, liteGatewayHealthEndpoint, liteRelayEndpoint } = await import('./lite-endpoints.ts');
const { liteRelayInfoQuery } = await import('./lite-relay-info-query.ts');

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  globalThis.fetch = originalFetch;
});

describe('lite endpoints', () => {
  it('are the bare routes for an app served at the root', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(liteRelayEndpoint(), '/api/lite-reply');
    assert.equal(liteGatewayHealthEndpoint(), '/api/lite-reply/health');
    assert.equal(liteGatewayEndpoint(), '/api/lite-gateway');
    assert.equal(liteGatewayEndpoint('/post'), '/api/lite-gateway/post');
  });

  it('are under the base path of a subdirectory deployment', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/blog';
    assert.equal(liteRelayEndpoint(), '/blog/api/lite-reply');
    assert.equal(liteGatewayHealthEndpoint(), '/blog/api/lite-reply/health');
    assert.equal(liteGatewayEndpoint(), '/blog/api/lite-gateway');
    assert.equal(liteGatewayEndpoint('/edit'), '/blog/api/lite-gateway/edit');
  });

  it('send the relay-info query to the relay under the base path', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/blog';
    const requested: string[] = [];
    globalThis.fetch = async (input: string | URL | Request) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ enabled: false }), { headers: { 'content-type': 'application/json' } });
    };
    assert.deepEqual(await liteRelayInfoQuery.queryFn(), { enabled: false });
    assert.deepEqual(requested, ['/blog/api/lite-reply']);
  });
});
