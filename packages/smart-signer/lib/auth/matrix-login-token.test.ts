import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@ui/` and `@smart-signer/` aliases do not resolve
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@ui/config/chat') return nextResolve('../../../ui/config/chat.ts', context);
    if (specifier === '@smart-signer/lib/auth/matrix-devices') return nextResolve('./matrix-devices.ts', context);
    return nextResolve(specifier, context);
  }
});

const { mintMatrixLoginToken, mintMatrixLoginTokenCreatingAccount } = await import('./matrix-login-token.ts');
const { FetchError, FetchTimeoutError } = await import('../fetch-json.ts');

const HOMESERVER = 'https://matrix.example.org';
const ADMIN_TOKEN = 'syt_admin_secret';
const TEMPORARY_TOKEN = 'syt_alice_temporary';
const LOGIN_TOKEN = 'syl_alice_login';
const SETTINGS = { homeserverUrl: HOMESERVER, serverName: 'example.org', adminToken: ADMIN_TOKEN };
const ADMIN_LOGIN = `${HOMESERVER}/_synapse/admin/v1/users/${encodeURIComponent('@alice:example.org')}/login`;
const GET_TOKEN = `${HOMESERVER}/_matrix/client/v1/login/get_token`;
const LOGOUT = `${HOMESERVER}/_matrix/client/v3/logout`;
const DEFAULT_ROOM = '#general:example.org';
const ACCOUNT_SETTINGS = { ...SETTINGS, defaultRoom: DEFAULT_ROOM };
const CREATE_USER = `${HOMESERVER}/_synapse/admin/v2/users/${encodeURIComponent('@alice:example.org')}`;
const JOIN_ROOM = `${HOMESERVER}/_synapse/admin/v1/join/${encodeURIComponent(DEFAULT_ROOM)}`;

interface SynapseCall {
  url: string;
  method: string;
  authorization: string;
  body: unknown;
  timeoutMs: number;
}

function httpError(status: number, body: object = {}, headers: Record<string, string> = {}): Error {
  const message = `Status: ${status}. Status Text: none`;
  const response = new Response(null, { status, headers });
  return new FetchError({ message, response, data: { error: { message }, ...body } });
}

/** Stands in for Synapse; `answers` replies by URL, a successful exchange unless overridden. */
function synapse(answers: Partial<Record<string, () => Promise<unknown>>> = {}) {
  const calls: SynapseCall[] = [];
  const defaults: Record<string, () => Promise<unknown>> = {
    [ADMIN_LOGIN]: async () => ({ access_token: TEMPORARY_TOKEN }),
    [GET_TOKEN]: async () => ({ login_token: LOGIN_TOKEN, expires_in_ms: 120_000 }),
    [LOGOUT]: async () => ({}),
    [CREATE_USER]: async () => ({ name: '@alice:example.org' }),
    [JOIN_ROOM]: async () => ({ room_id: '!general:example.org' })
  };
  const request = (url: string, init: RequestInit, timeoutMs: number) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      authorization: new Headers(init.headers).get('Authorization') ?? '',
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      timeoutMs
    });
    const answer = answers[url] ?? defaults[url];
    return answer ? answer() : Promise.reject(new Error(`unexpected ${url}`));
  };
  return { calls, request };
}

function failureLog() {
  const lines: string[] = [];
  const report = (userId: string, reason: string) => lines.push(`${userId}: ${reason}`);
  return { lines, report };
}

function assertNoTokenIn(lines: string[]): void {
  for (const line of lines) {
    for (const token of [ADMIN_TOKEN, TEMPORARY_TOKEN, LOGIN_TOKEN]) assert.ok(!line.includes(token), line);
  }
}

describe('mintMatrixLoginToken', () => {
  it('returns a login token got with a temporary session of the user, then logs that session out', async () => {
    const { calls, request } = synapse();
    const { lines, report } = failureLog();
    const before = Date.now();

    const result = await mintMatrixLoginToken('alice', SETTINGS, request, report);

    assert.deepEqual(result, { kind: 'token', loginToken: LOGIN_TOKEN });
    assert.deepEqual(
      calls.map(({ url, method, authorization }) => ({ url, method, authorization })),
      [
        { url: ADMIN_LOGIN, method: 'POST', authorization: `Bearer ${ADMIN_TOKEN}` },
        { url: GET_TOKEN, method: 'POST', authorization: `Bearer ${TEMPORARY_TOKEN}` },
        { url: LOGOUT, method: 'POST', authorization: `Bearer ${TEMPORARY_TOKEN}` }
      ]
    );
    const validUntil = Number(Reflect.get(Object(calls[0].body), 'valid_until_ms'));
    assert.ok(validUntil > before && validUntil <= Date.now() + 60_000, `valid_until_ms ${validUntil}`);
    for (const call of calls) assert.ok(call.timeoutMs > 0 && call.timeoutMs <= 10_000);
    assert.deepEqual(lines, []);
  });

  it('answers unknown-user, without a report, when Synapse has no account for the user', async () => {
    const { calls, request } = synapse({ [ADMIN_LOGIN]: () => Promise.reject(httpError(404)) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, request, report), { kind: 'unknown-user' });
    assert.deepEqual(
      calls.map((call) => call.url),
      [ADMIN_LOGIN]
    );
    assert.deepEqual(lines, []);
  });

  it('fails, reporting it, on a timeout of the admin login', async () => {
    const timeout = new FetchTimeoutError({ url: ADMIN_LOGIN, timeoutMs: 5000, elapsedMs: 5001 });
    const { request } = synapse({ [ADMIN_LOGIN]: () => Promise.reject(timeout) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, request, report), { kind: 'failed' });
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^@alice:example\.org: minting a login token: No response from/);
  });

  it('fails on a 5xx of get_token, and still logs the temporary session out', async () => {
    const { calls, request } = synapse({ [GET_TOKEN]: () => Promise.reject(httpError(500)) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, request, report), { kind: 'failed' });
    assert.deepEqual(
      calls.map((call) => call.url),
      [ADMIN_LOGIN, GET_TOKEN, LOGOUT]
    );
    assert.deepEqual(lines, ['@alice:example.org: minting a login token: Status: 500. Status Text: none']);
  });

  it('keeps the token when only the logout fails, and reports that', async () => {
    const { request } = synapse({ [LOGOUT]: () => Promise.reject(httpError(502)) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, request, report), {
      kind: 'token',
      loginToken: LOGIN_TOKEN
    });
    assert.deepEqual(lines, ['@alice:example.org: logging out the temporary session: Status: 502. Status Text: none']);
  });

  it('never reports a token, even when an error message carries one', async () => {
    const leaky = (text: string) => () => Promise.reject(new Error(text));
    const { lines, report } = failureLog();

    await mintMatrixLoginToken('alice', SETTINGS, synapse({ [ADMIN_LOGIN]: leaky(`denied ${ADMIN_TOKEN}`) }).request, report);
    await mintMatrixLoginToken(
      'alice',
      SETTINGS,
      synapse({
        [GET_TOKEN]: leaky(`refused ${TEMPORARY_TOKEN} ${ADMIN_TOKEN}`),
        [LOGOUT]: leaky(`gone ${TEMPORARY_TOKEN}`)
      }).request,
      report
    );
    await mintMatrixLoginToken('alice', SETTINGS, synapse({ [LOGOUT]: leaky(`kept ${LOGIN_TOKEN}`) }).request, report);

    assert.equal(lines.length, 4);
    assertNoTokenIn(lines);
    assert.ok(lines.every((line) => line.includes('[redacted]')));
  });

  it('fails when Synapse answers without a token', async () => {
    const { request } = synapse({ [GET_TOKEN]: async () => ({}) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, request, report), { kind: 'failed' });
    assert.deepEqual(lines, ['@alice:example.org: minting a login token: Synapse answered without login_token']);
  });

  it("answers rate-limited with Synapse's retry_after_ms on a 429 of get_token, without a report", async () => {
    const limited = httpError(429, { errcode: 'M_LIMIT_EXCEEDED', retry_after_ms: 41_500 });
    const { calls, request } = synapse({ [GET_TOKEN]: () => Promise.reject(limited) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, request, report), {
      kind: 'rate-limited',
      retryAfterMs: 41_500
    });
    assert.deepEqual(
      calls.map((call) => call.url),
      [ADMIN_LOGIN, GET_TOKEN, LOGOUT]
    );
    assert.deepEqual(lines, []);
  });

  it('takes the wait of a 429 from Retry-After, or a minute, when the answer names none', async () => {
    const withHeader = synapse({ [GET_TOKEN]: () => Promise.reject(httpError(429, {}, { 'Retry-After': '12' })) });
    const bare = synapse({ [GET_TOKEN]: () => Promise.reject(httpError(429)) });
    const { report } = failureLog();

    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, withHeader.request, report), {
      kind: 'rate-limited',
      retryAfterMs: 12_000
    });
    assert.deepEqual(await mintMatrixLoginToken('alice', SETTINGS, bare.request, report), {
      kind: 'rate-limited',
      retryAfterMs: 60_000
    });
  });
});

describe('mintMatrixLoginTokenCreatingAccount', () => {
  const displayNameOf = async (username: string) => `${username} (Hive)`;

  /** Synapse without Alice's account until it is created */
  function synapseWithoutAccount(answers: Partial<Record<string, () => Promise<unknown>>> = {}) {
    let created = false;
    const exchange = synapse({
      [ADMIN_LOGIN]: async () => {
        if (!created) throw httpError(404, { errcode: 'M_NOT_FOUND', error: 'User not found' });
        return { access_token: TEMPORARY_TOKEN };
      },
      [CREATE_USER]: async () => {
        created = true;
        return { name: '@alice:example.org' };
      },
      ...answers
    });
    return exchange;
  }

  it('mints for an existing account without creating one', async () => {
    const { calls, request } = synapse();
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginTokenCreatingAccount('alice', displayNameOf, ACCOUNT_SETTINGS, request, report), {
      kind: 'token',
      loginToken: LOGIN_TOKEN
    });
    assert.deepEqual(
      calls.map((call) => call.url),
      [ADMIN_LOGIN, GET_TOKEN, LOGOUT]
    );
    assert.deepEqual(lines, []);
  });

  it('creates the account of an unknown user, joins it to the default room, then mints', async () => {
    const { calls, request } = synapseWithoutAccount();
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginTokenCreatingAccount('alice', displayNameOf, ACCOUNT_SETTINGS, request, report), {
      kind: 'token',
      loginToken: LOGIN_TOKEN
    });
    assert.deepEqual(
      calls.map(({ url, method, authorization }) => ({ url, method, authorization })),
      [
        { url: ADMIN_LOGIN, method: 'POST', authorization: `Bearer ${ADMIN_TOKEN}` },
        { url: CREATE_USER, method: 'PUT', authorization: `Bearer ${ADMIN_TOKEN}` },
        { url: JOIN_ROOM, method: 'POST', authorization: `Bearer ${ADMIN_TOKEN}` },
        { url: ADMIN_LOGIN, method: 'POST', authorization: `Bearer ${ADMIN_TOKEN}` },
        { url: GET_TOKEN, method: 'POST', authorization: `Bearer ${TEMPORARY_TOKEN}` },
        { url: LOGOUT, method: 'POST', authorization: `Bearer ${TEMPORARY_TOKEN}` }
      ]
    );
    assert.deepEqual(calls[1].body, { displayname: 'alice (Hive)' });
    assert.deepEqual(calls[2].body, { user_id: '@alice:example.org' });
    for (const call of calls) assert.ok(call.timeoutMs > 0 && call.timeoutMs <= 10_000);
    assert.deepEqual(lines, []);
  });

  it('joins no room without a default room', async () => {
    const { calls, request } = synapseWithoutAccount();
    const { report } = failureLog();

    await mintMatrixLoginTokenCreatingAccount('alice', displayNameOf, { ...SETTINGS, defaultRoom: '' }, request, report);
    assert.deepEqual(
      calls.map((call) => call.url),
      [ADMIN_LOGIN, CREATE_USER, ADMIN_LOGIN, GET_TOKEN, LOGOUT]
    );
  });

  it('fails, reporting it without a token, when the account cannot be created', async () => {
    const { calls, request } = synapseWithoutAccount({
      [CREATE_USER]: () => Promise.reject(new Error(`Status: 500 for ${ADMIN_TOKEN}`))
    });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginTokenCreatingAccount('alice', displayNameOf, ACCOUNT_SETTINGS, request, report), {
      kind: 'failed'
    });
    assert.deepEqual(
      calls.map((call) => call.url),
      [ADMIN_LOGIN, CREATE_USER]
    );
    assert.deepEqual(lines, ['@alice:example.org: creating the account: Status: 500 for [redacted]']);
  });

  it('still mints when only the join fails, and reports that', async () => {
    const { request } = synapseWithoutAccount({ [JOIN_ROOM]: () => Promise.reject(httpError(403)) });
    const { lines, report } = failureLog();

    assert.deepEqual(await mintMatrixLoginTokenCreatingAccount('alice', displayNameOf, ACCOUNT_SETTINGS, request, report), {
      kind: 'token',
      loginToken: LOGIN_TOKEN
    });
    assert.deepEqual(lines, [`@alice:example.org: joining ${DEFAULT_ROOM}: Status: 403. Status Text: none`]);
  });
});
