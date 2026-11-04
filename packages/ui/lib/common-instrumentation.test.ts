import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatStartupEnvironment } from './common-instrumentation.ts';

describe('formatStartupEnvironment', () => {
  it('never prints the value of a server-side variable', () => {
    const lines = formatStartupEnvironment({
      DENSER_SERVER_COOKIE_PASSWORD: 'cookie-secret',
      DENSER_SERVER_OIDC_CLIENTS: '[{"secret":"oidc-secret"}]',
      DENSER_SERVER_ENV_DUMP: 'true',
      HIVE_POSTING_KEY: 'posting-secret'
    });

    assert.deepEqual(lines, [
      'DENSER_SERVER_COOKIE_PASSWORD: <set>',
      'DENSER_SERVER_ENV_DUMP: <set>',
      'DENSER_SERVER_OIDC_CLIENTS: <set>',
      'HIVE_POSTING_KEY: <set>'
    ]);
  });

  it('prints the values of browser-public variables and skips unrelated ones', () => {
    const lines = formatStartupEnvironment({
      REACT_APP_API_ENDPOINT: 'https://api.hive.blog',
      NEXT_PUBLIC_BASE_PATH: '/blog',
      REACT_APP_SENTRY_DSN: '',
      PATH: '/usr/bin'
    });

    assert.deepEqual(lines, [
      'NEXT_PUBLIC_BASE_PATH: /blog',
      'REACT_APP_API_ENDPOINT: https://api.hive.blog',
      'REACT_APP_SENTRY_DSN: <empty>'
    ]);
  });
});
