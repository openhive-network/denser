import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { appApiPath } from './app-api-path.ts';

describe('appApiPath', () => {
  const original = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = original;
    }
  });

  it('prefixes the base path the app is built with', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/wallet';
    assert.equal(appApiPath('/api/auth/switch'), '/wallet/api/auth/switch');
  });

  it('leaves the path as is for an app served at the root', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(appApiPath('/api/users/me'), '/api/users/me');
  });
});
