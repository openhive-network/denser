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

const { mintMatrixLoginToken } = await import('./matrix-login-token.ts');
const { FetchError, FetchTimeoutError } = await import('../fetch-json.ts');

const HOMESERVER = 'https://matrix.example.org';
const ADMIN_TOKEN = 'syt_admin_secret';
const TEMPORARY_TOKEN = 'syt_alice_temporary';
const LOGIN_TOKEN = 'syl_alice_login';
const SETTINGS = { homeserverUrl: HOMESERVER, serverName: 'example.org', adminToken: ADMIN_TOKEN };
const ADMIN_LOGIN = `${HOMESERVER}/_synapse/admin/v1/users/${encodeURIComponent('@alice:example.org')}/login`;
const GET_TOKEN = `${HOMESERVER}/_matrix/client/v1/login/get_token`;
const LOGOUT = `${HOMESERVER}/_matrix/client/v3/logout`;

interface SynapseCall {
  url: string;
  method: string;
  authorization: string;
  body: unknown;
  timeoutMs: number;
}

function httpError(status: number): Error {
  const message = `Status: ${status}. Status Text: none`;
  return new FetchError({ message, response: new Response(null, { status }), data: { error: { message } } });
}

/** Stands in for Synapse; `answers` replies by URL, a successful exchange unless overridden. */
function synapse(answers: Partial<Record<string, () => Promise<unknown>>> = {}) {
  const calls: SynapseCall[] = [];
  const defaults: Record<string, () => Promise<unknown>> = {
    [ADMIN_LOGIN]: async () => ({ access_token: TEMPORARY_TOKEN }),
    [GET_TOKEN]: async () => ({ login_token: LOGIN_TOKEN, expires_in_ms: 120_000 }),
    [LOGOUT]: async () => ({})
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
});
