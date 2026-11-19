import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HIVEAUTH_SERVER, hiveAuthConnectOrigins, resolveHiveAuthConfig } from './hiveauth.ts';

const readFrom =
  (values: Record<string, string>) =>
  (key: string): string | undefined =>
    values[key];

describe('resolveHiveAuthConfig', () => {
  it('is on with the public relay when nothing is set', () => {
    assert.deepEqual(resolveHiveAuthConfig(readFrom({})), { enabled: true, serverUrl: DEFAULT_HIVEAUTH_SERVER });
  });

  it('is off only when HIVEAUTH_ENABLED says so', () => {
    for (const value of ['no', 'NO', 'false', 'off', '0', ' no ']) {
      assert.equal(resolveHiveAuthConfig(readFrom({ HIVEAUTH_ENABLED: value })).enabled, false, value);
    }
    for (const value of ['yes', 'true', '', 'on']) {
      assert.equal(resolveHiveAuthConfig(readFrom({ HIVEAUTH_ENABLED: value })).enabled, true, value);
    }
  });

  it('takes the relay from HIVEAUTH_SERVER, a bare host as wss', () => {
    assert.equal(
      resolveHiveAuthConfig(readFrom({ HIVEAUTH_SERVER: 'wss://has.example.org/' })).serverUrl,
      'wss://has.example.org'
    );
    assert.equal(
      resolveHiveAuthConfig(readFrom({ HIVEAUTH_SERVER: 'has.example.org:8443' })).serverUrl,
      'wss://has.example.org:8443'
    );
    assert.equal(
      resolveHiveAuthConfig(readFrom({ HIVEAUTH_SERVER: 'wss://has.example.org/relay/' })).serverUrl,
      'wss://has.example.org/relay'
    );
  });

  it('keeps the public relay for a value that is not a wss URL', () => {
    for (const value of ['https://has.example.org', 'ws://has.example.org', 'wss://', 'wss://h.org/?x=1']) {
      assert.equal(resolveHiveAuthConfig(readFrom({ HIVEAUTH_SERVER: value })).serverUrl, DEFAULT_HIVEAUTH_SERVER, value);
    }
  });
});

describe('hiveAuthConnectOrigins', () => {
  it("lists the relay's origin while HiveAuth is on, and nothing while it is off", () => {
    assert.deepEqual(hiveAuthConnectOrigins({ enabled: true, serverUrl: 'wss://has.example.org/relay' }), [
      'wss://has.example.org'
    ]);
    assert.deepEqual(hiveAuthConnectOrigins({ enabled: false, serverUrl: 'wss://has.example.org' }), []);
  });
});
