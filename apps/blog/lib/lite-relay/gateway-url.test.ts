import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { liteGatewayUrl } = await import('./gateway-url.ts');

const VARIABLE = 'DENSER_SERVER_LITE_GATEWAY_URL';
const original = process.env[VARIABLE];

describe('liteGatewayUrl', () => {
  afterEach(() => {
    if (original === undefined) delete process.env[VARIABLE];
    else process.env[VARIABLE] = original;
  });

  it('names no gateway when the variable is unset, empty or blank', () => {
    delete process.env[VARIABLE];
    assert.equal(liteGatewayUrl(), undefined);
    process.env[VARIABLE] = '';
    assert.equal(liteGatewayUrl(), undefined);
    process.env[VARIABLE] = '  \t';
    assert.equal(liteGatewayUrl(), undefined);
  });

  it('uses the configured URL, trimmed and without trailing slashes', () => {
    process.env[VARIABLE] = ' https://steem-16.syncad.com/lite-gateway-api// ';
    assert.equal(liteGatewayUrl(), 'https://steem-16.syncad.com/lite-gateway-api');
    process.env[VARIABLE] = 'https://gateway.example';
    assert.equal(liteGatewayUrl(), 'https://gateway.example');
  });
});
