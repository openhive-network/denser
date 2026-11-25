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

describe('lite relay info', () => {
  const RELAY = { enabled: true, gate_account: 'test-gateway-1', chain_id: 'beef', apps: { account: 'lite_account', posts: 'lite_posts' } };
  const answer = (body: unknown) => {
    globalThis.fetch = async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  };

  it('keeps the gateway gate accounts and public URL', async () => {
    const body = { ...RELAY, gate_accounts: ['test-gateway-1', 'test-gateway-2'], public_url: 'https://gw.example' };
    answer(body);
    assert.deepEqual(await liteRelayInfoQuery.queryFn(), body);
  });

  it('reads an older gateway without them as before', async () => {
    answer(RELAY);
    assert.deepEqual(await liteRelayInfoQuery.queryFn(), RELAY);
  });

  it('drops malformed gate accounts and public URL, keeping the relay', async () => {
    answer({ ...RELAY, gate_accounts: ['test-gateway-1', 7], public_url: 42 });
    assert.deepEqual(await liteRelayInfoQuery.queryFn(), RELAY);
    answer({ ...RELAY, gate_accounts: 'test-gateway-1' });
    assert.deepEqual(await liteRelayInfoQuery.queryFn(), RELAY);
  });
});
