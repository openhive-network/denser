import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { seedAuthCookie } from '../support/fixture-auth/seeder';
import { FIXTURE_OAUTH_CLIENT_SECRET } from '../support/fixture-auth/constants';

/**
 * The blog as an OAuth2 provider ("Sign in with Denser" for openhive.chat), end
 * to end: authorize, sign in on /login, back to authorize, the code exchange and
 * userinfo, with the spec playing openhive.chat. The fixture server registers the
 * `denser` client with FIXTURE_OAUTH_CLIENT_SECRET.
 *
 * Tagged @basepath: .aidev/run-fixture-e2e.sh runs it a second time against a
 * build served under /blog, where every redirect has to keep the base path.
 *
 * Each hop is one request with redirects off, so the spec reads every Location.
 * Locations are absolute on the configured site URL (production's in the root
 * pass), so a hop on the site is followed by its path on this server, and the
 * final redirect to openhive.chat is only read: nothing leaves localhost.
 *
 * The `login` recording answers the profile read behind userinfo.
 */

test.use({ fixtureTestName: 'login' });

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const CLIENT_ID = 'denser';
const REDIRECT_URI = 'https://openhive.chat/_oauth/denser';
const STATE = 's1';
const LOGIN_PAGE_MARKER = 'data-testid="login-page"';

/** A site path under the base path the server is served at. */
function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

function authorizePath(redirectUri: string): string {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    state: STATE
  });
  return withBase(`/api/oauth/authorize?${query}`);
}

function redirectLocation(response: APIResponse): URL {
  const location = response.headers()['location'];
  expect(location, 'Location header').toBeTruthy();
  return new URL(location);
}

/** The redirect's path and query, to request from this server. */
function sitePath(location: URL): string {
  return `${location.pathname}${location.search}`;
}

function exchangeCode(request: APIRequestContext, code: string, clientSecret: string) {
  return request.post(withBase('/api/oauth/token'), {
    form: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: clientSecret
    }
  });
}

test.describe('OAuth2 provider flow', { tag: '@basepath' }, () => {
  test('OAUTH-FLOW-01 — a signed-out user signs in and the client gets a code, a token and the profile', async ({
    context
  }) => {
    const request = context.request;

    const loginPath = await test.step('authorize sends a signed-out user to /login', async () => {
      const response = await request.get(authorizePath(REDIRECT_URI), { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      const location = redirectLocation(response);
      expect(location.pathname).toBe(withBase('/login'));
      expect(location.searchParams.get('oauth_return')).toBe('true');
      return sitePath(location);
    });

    const user = await test.step('the sign-in page answers, and the user signs in', async () => {
      const response = await request.get(loginPath, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain(LOGIN_PAGE_MARKER);
      return seedAuthCookie(context, { authenticateOnBackend: true, strict: true });
    });

    const code = await test.step('/login resumes the request, and authorize redirects to the client with a code', async () => {
      const resumed = await request.get(loginPath, { maxRedirects: 0 });
      expect(resumed.status()).toBe(307);
      const authorize = redirectLocation(resumed);
      expect(authorize.pathname).toBe(withBase('/api/oauth/authorize'));
      expect(authorize.searchParams.get('client_id')).toBe(CLIENT_ID);
      expect(authorize.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
      expect(authorize.searchParams.get('state')).toBe(STATE);

      const response = await request.get(sitePath(authorize), { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      const callback = redirectLocation(response);
      expect(`${callback.origin}${callback.pathname}`).toBe(REDIRECT_URI);
      expect(callback.searchParams.get('state')).toBe(STATE);
      const issued = callback.searchParams.get('code');
      expect(issued, 'authorization code').toBeTruthy();
      return issued ?? '';
    });

    await test.step('the token endpoint rejects a wrong client secret', async () => {
      const response = await exchangeCode(request, code, `${FIXTURE_OAUTH_CLIENT_SECRET}-wrong`);
      expect(response.status()).toBe(401);
      expect((await response.json()).error).toBe('invalid_client');
    });

    const accessToken = await test.step('the client exchanges the code for an access token', async () => {
      const response = await exchangeCode(request, code, FIXTURE_OAUTH_CLIENT_SECRET);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.token_type).toBe('Bearer');
      expect(typeof body.access_token).toBe('string');
      return String(body.access_token);
    });

    await test.step('userinfo returns the signed-in user', async () => {
      const response = await request.get(withBase('/api/oauth/userinfo'), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.sub).toBe(user.username);
      expect(body.username).toBe(user.username);
    });
  });

  test('OAUTH-FLOW-02 — authorize refuses a redirect_uri the client did not register, without redirecting', async ({
    request
  }) => {
    const response = await request.get(authorizePath('https://evil.example.com/_oauth/denser'), {
      maxRedirects: 0
    });
    expect(response.status()).toBe(400);
    expect(response.headers()['location']).toBeUndefined();
    expect((await response.json()).error).toBe('invalid_request');
  });
});
