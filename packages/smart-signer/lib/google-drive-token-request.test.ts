import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { IncomingHttpHeaders } from 'http';
import type { User } from '@smart-signer/types/common';
import type { IGoogleDriveTokenRequest } from './google-drive-token-request.ts';

// Under node's type stripping the `@smart-signer/` and `@ui/` aliases do not resolve
const LOGGER = 'export const getLogger = () => ({ error() {}, info() {}, debug() {} });';
const MODULES: Record<string, string> = {
  '@ui/lib/logging': `data:text/javascript,${encodeURIComponent(LOGGER)}`,
  '@smart-signer/lib/session': `data:text/javascript,${encodeURIComponent('export const cookieNamePrefix = "blog_";')}`,
  '@smart-signer/lib/set-cookie': new URL('./set-cookie.ts', import.meta.url).href,
  '@smart-signer/lib/csrf-protection': new URL('./csrf-protection.ts', import.meta.url).href,
  '@smart-signer/lib/same-origin-request': new URL('./same-origin-request.ts', import.meta.url).href,
  '@smart-signer/lib/api-handlers/auth/challenge': new URL('./api-handlers/auth/challenge.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (MODULES[specifier]) return { url: MODULES[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { answerGoogleDriveRefresh, googleDriveTokenRequestRefusal } = await import('./google-drive-token-request.ts');
const { LOGIN_CHALLENGE_COOKIE } = await import('./api-handlers/auth/challenge.ts');

const SAME_ORIGIN: IncomingHttpHeaders = {
  host: 'denser.example.org',
  'sec-fetch-site': 'same-origin',
  'x-csrf-token': '1'
};

// Value of LoginType.google: the enums cannot load under type stripping
const SIGNED_IN = { isLoggedIn: true, username: 'alice', loginType: 'google' } as User;

function request(overrides: Partial<IGoogleDriveTokenRequest> = {}): IGoogleDriveTokenRequest {
  return { headers: SAME_ORIGIN, cookies: {}, user: SIGNED_IN, ...overrides };
}

function googleStub(accessToken = 'access') {
  const calls: string[] = [];
  const refresh = async (refreshToken: string) => {
    calls.push(refreshToken);
    return accessToken;
  };
  return { calls, refresh };
}

describe('googleDriveTokenRequestRefusal', () => {
  it('accepts a same-origin request with the CSRF header and a signed-in session', () => {
    assert.equal(googleDriveTokenRequestRefusal(request()), undefined);
    const byOrigin = { host: 'denser.example.org', origin: 'https://denser.example.org', 'x-csrf-token': '1' };
    assert.equal(googleDriveTokenRequestRefusal(request({ headers: byOrigin })), undefined);
  });

  it('accepts a sign-in in progress, which has the login challenge cookie but no session yet', () => {
    const signingIn = request({ user: undefined, cookies: { [LOGIN_CHALLENGE_COOKIE]: crypto.randomUUID() } });
    assert.equal(googleDriveTokenRequestRefusal(signingIn), undefined);
  });

  it('refuses a request without the CSRF header', () => {
    const { 'x-csrf-token': _header, ...headers } = SAME_ORIGIN;
    assert.match(googleDriveTokenRequestRefusal(request({ headers })) ?? '', /x-csrf-token/);
  });

  it('refuses a cross-origin request, even with a session', () => {
    const crossSite = { ...SAME_ORIGIN, 'sec-fetch-site': 'cross-site' };
    assert.equal(googleDriveTokenRequestRefusal(request({ headers: crossSite })), 'Cross-origin request');
    const { 'sec-fetch-site': _site, ...withoutFetchSite } = SAME_ORIGIN;
    const foreign = { ...withoutFetchSite, origin: 'https://evil.example' };
    assert.equal(googleDriveTokenRequestRefusal(request({ headers: foreign })), 'Cross-origin request');
    assert.equal(googleDriveTokenRequestRefusal(request({ headers: withoutFetchSite })), 'Cross-origin request');
  });

  it('refuses a request with neither a signed-in session nor a login challenge', () => {
    assert.equal(googleDriveTokenRequestRefusal(request({ user: undefined })), 'No signed-in session');
    const signedOut = { ...SIGNED_IN, isLoggedIn: false };
    assert.equal(googleDriveTokenRequestRefusal(request({ user: signedOut })), 'No signed-in session');
    const otherCookie = { blog_session: 'sealed' };
    assert.equal(googleDriveTokenRequestRefusal(request({ user: undefined, cookies: otherCookie })), 'No signed-in session');
  });
});

describe('answerGoogleDriveRefresh', () => {
  it('answers an accepted request with the access token Google gives for its refresh token', async () => {
    const google = googleStub('fresh-access');
    const answer = await answerGoogleDriveRefresh(request(), { refreshToken: 'refresh' }, google.refresh);
    assert.deepEqual(answer, { status: 200, body: { accessToken: 'fresh-access' } });
    assert.deepEqual(google.calls, ['refresh']);
  });

  it('answers 403 without calling Google to a cross-origin request', async () => {
    const google = googleStub();
    const headers = { host: 'denser.example.org', origin: 'https://evil.example', 'x-csrf-token': '1' };
    const answer = await answerGoogleDriveRefresh(request({ headers }), { refreshToken: 'refresh' }, google.refresh);
    assert.equal(answer.status, 403);
    assert.equal(answer.body.accessToken, undefined);
    assert.deepEqual(google.calls, []);
  });

  it('answers 403 without calling Google to a request without a session', async () => {
    const google = googleStub();
    const answer = await answerGoogleDriveRefresh(request({ user: undefined }), { refreshToken: 'refresh' }, google.refresh);
    assert.equal(answer.status, 403);
    assert.deepEqual(google.calls, []);
  });

  it('answers 400 without calling Google to an accepted request without a refresh token', async () => {
    for (const body of [{}, { refreshToken: '' }, { refreshToken: 42 }, null, 'refresh']) {
      const google = googleStub();
      const answer = await answerGoogleDriveRefresh(request(), body, google.refresh);
      assert.equal(answer.status, 400);
      assert.deepEqual(google.calls, []);
    }
  });

  it('answers 500 with no Google error text when the refresh fails', async () => {
    const failing = async () => {
      throw new Error('invalid_grant: Token has been expired or revoked.');
    };
    const answer = await answerGoogleDriveRefresh(request(), { refreshToken: 'refresh' }, failing);
    assert.deepEqual(answer, { status: 500, body: { error: 'Internal server error' } });
  });
});
