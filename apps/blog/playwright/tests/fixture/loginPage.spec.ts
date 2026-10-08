import { sealData } from 'iron-session';
import { test, expect } from '../support/fixture-proxy-test';
import { FIXTURE_COOKIE_NAME, FIXTURE_COOKIE_PASSWORD } from '../support/fixture-auth/constants';
import { LoginType, KeyType, type IronSessionData, type User } from '@smart-signer/types/common';

/**
 * The standalone /login page, where /api/oauth/authorize sends signed-out users
 * (`?oauth_return=true`). It used to be a Pages Router page rendered without the
 * app's providers and answered 500 ("No QueryClient set") to every request.
 *
 * A signed-in session with a pending OAuth request is resumed by the server,
 * from the session cookie; any other visitor gets the sign-in page.
 *
 * Reads server responses only, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const LOGIN_PAGE_MARKER = 'data-testid="login-page"';

const OAUTH_STATE = {
  clientId: 'fixture-client',
  redirectUri: 'https://chat.example.com/_oauth/denser',
  scope: 'openid profile',
  state: 'fixture-state'
};

const SIGNED_IN_USER: User = {
  isLoggedIn: true,
  username: 'guest4test',
  avatarUrl: '',
  loginType: LoginType.wif,
  keyType: KeyType.posting,
  authenticateOnBackend: true,
  chatAuthToken: '',
  oauthConsent: {},
  strict: true
};

async function sessionCookie(data: IronSessionData): Promise<string> {
  return `${FIXTURE_COOKIE_NAME}=${await sealData(data, { password: FIXTURE_COOKIE_PASSWORD })}`;
}

test.describe('Login page', () => {
  test('LOGIN-PAGE-01 — /login answers 200 with the sign-in page and the app runtime config', async ({
    request
  }) => {
    const response = await request.get('/login');
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(LOGIN_PAGE_MARKER);
    expect(html).toContain('/__ENV.js');
  });

  test('LOGIN-PAGE-02 — /login?oauth_return=true answers 200 with the sign-in page for a signed-out visitor', async ({
    request
  }) => {
    const response = await request.get('/login?oauth_return=true', {
      headers: { cookie: await sessionCookie({ oauthState: OAUTH_STATE }) }
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(LOGIN_PAGE_MARKER);
  });

  test('LOGIN-PAGE-03 — a signed-in session with a pending OAuth request is sent back to authorize', async ({
    request
  }) => {
    const response = await request.get('/login?oauth_return=true', {
      headers: { cookie: await sessionCookie({ user: SIGNED_IN_USER, oauthState: OAUTH_STATE }) },
      maxRedirects: 0
    });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers()['location']);
    expect(location.pathname).toBe('/api/oauth/authorize');
    expect(location.searchParams.get('client_id')).toBe(OAUTH_STATE.clientId);
    expect(location.searchParams.get('redirect_uri')).toBe(OAUTH_STATE.redirectUri);
    expect(location.searchParams.get('state')).toBe(OAUTH_STATE.state);
  });

  test('LOGIN-PAGE-04 — a session the authorize endpoint would reject gets the sign-in page, not a redirect', async ({
    request
  }) => {
    const notBackendAuthenticated = { ...SIGNED_IN_USER, authenticateOnBackend: false };
    const cases: Array<[string, IronSessionData]> = [
      ['no pending OAuth request', { user: SIGNED_IN_USER }],
      ['not authenticated on the backend', { user: notBackendAuthenticated, oauthState: OAUTH_STATE }]
    ];
    for (const [label, data] of cases) {
      const response = await request.get('/login?oauth_return=true', {
        headers: { cookie: await sessionCookie(data) },
        maxRedirects: 0
      });
      expect(response.status(), label).toBe(200);
      expect(await response.text(), label).toContain(LOGIN_PAGE_MARKER);
    }
  });
});
