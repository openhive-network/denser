import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { User } from '@smart-signer/types/common';

// Under node's type stripping the `@ui/` alias does not resolve
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@ui/config/chat') return nextResolve('../../../ui/config/chat.ts', context);
    return nextResolve(specifier, context);
  }
});

const { matrixSessionEnder } = await import('./matrix-devices.ts');

const HOMESERVER = 'https://matrix.example.org';
const ADMIN_TOKEN = 'syt_admin_secret';
const SETTINGS = {
  provider: 'matrix' as const,
  homeserverUrl: HOMESERVER,
  serverName: 'example.org',
  adminToken: ADMIN_TOKEN
};
const ALICE_URL = `${HOMESERVER}/_synapse/admin/v2/users/${encodeURIComponent('@alice:example.org')}`;

function account(username: string): User {
  return {
    isLoggedIn: true,
    username,
    avatarUrl: '',
    // Values of LoginType.keychain and KeyType.posting: the enums cannot load under type stripping
    loginType: 'keychain' as User['loginType'],
    keyType: 'posting' as User['keyType'],
    authenticateOnBackend: true,
    chatAuthToken: '',
    oauthConsent: {},
    strict: true
  };
}

interface AdminCall {
  url: string;
  method: string;
  authorization: string;
  body: unknown;
  timeoutMs: number;
}

/** Stands in for Synapse's admin API; `answer` replies to each call. */
function synapse(answer: (url: string) => Promise<unknown>) {
  const calls: AdminCall[] = [];
  const request = (url: string, init: RequestInit, timeoutMs: number) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      authorization: new Headers(init.headers).get('Authorization') ?? '',
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      timeoutMs
    });
    return answer(url);
  };
  return { calls, request };
}

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

const DEVICES = { devices: [{ device_id: 'DEVA' }, { device_id: 'DEVB', display_name: 'Element' }], total: 2 };

describe('matrixSessionEnder', () => {
  it("deletes every device of the user's Matrix account through the admin API", async () => {
    const { calls, request } = synapse(async (url) => (url.endsWith('/devices') ? DEVICES : {}));
    const ender = matrixSessionEnder(SETTINGS, request, () => assert.fail('no failure expected'));

    assert.equal(ender?.sessionOf(account('alice')), '@alice:example.org');
    assert.equal(await ender?.end(account('alice')), true);

    assert.deepEqual(
      calls.map(({ url, method, body }) => ({ url, method, body })),
      [
        { url: `${ALICE_URL}/devices`, method: 'GET', body: undefined },
        { url: `${ALICE_URL}/delete_devices`, method: 'POST', body: { devices: ['DEVA', 'DEVB'] } }
      ]
    );
    for (const call of calls) {
      assert.equal(call.authorization, `Bearer ${ADMIN_TOKEN}`);
      assert.ok(call.timeoutMs > 0 && call.timeoutMs <= 10_000);
    }
  });

  it('deletes nothing for a user with no devices', async () => {
    const { calls, request } = synapse(async () => ({ devices: [], total: 0 }));
    const ended = await matrixSessionEnder(SETTINGS, request, () => assert.fail('no failure expected'))?.end(
      account('alice')
    );

    assert.equal(ended, true);

    assert.deepEqual(
      calls.map((call) => call.url),
      [`${ALICE_URL}/devices`]
    );
  });

  it('is off in Rocket.Chat mode, and without an admin token', () => {
    const { request } = synapse(async () => DEVICES);
    const noFailures = () => {};
    assert.equal(matrixSessionEnder({ ...SETTINGS, provider: 'rocketchat' }, request, noFailures), undefined);
    assert.equal(matrixSessionEnder({ ...SETTINGS, adminToken: '' }, request, noFailures), undefined);
  });

  it('resolves once Synapse answers, to false for a failure it reports without the admin token', async () => {
    let fail: (error: Error) => void = () => {};
    const failures: string[] = [];
    const { request } = synapse(() => new Promise((_resolve, reject) => (fail = reject)));

    const ender = matrixSessionEnder(SETTINGS, request, (userId, reason) => failures.push(`${userId}: ${reason}`));
    const ended = ender?.end(account('alice'));
    await settle();
    assert.deepEqual(failures, []);

    fail(new Error(`Unauthorized: ${ADMIN_TOKEN}`));
    assert.equal(await ended, false);
    assert.deepEqual(failures, ['@alice:example.org: Unauthorized: [redacted]']);
  });
});
