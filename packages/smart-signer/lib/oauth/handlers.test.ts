import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * denser's OAuth server as Synapse's OIDC provider calls it: `scope=profile` (no `openid`, so no
 * id_token or nonce), a `state`, no PKCE, and the client authenticated with `client_secret_basic`.
 */

const SITE_URL = 'https://denser.example.org/blog';
const CALLBACK = 'https://matrix.example.org/_synapse/client/oidc/callback';
// Synapse URL-encodes the credentials it puts in the Basic header
const MATRIX_SECRET = 'matrix+secret/with=specials';

interface TestSession {
  user?: { isLoggedIn: boolean; username: string; authenticateOnBackend: boolean; oauthConsent?: Record<string, boolean> };
  oauthState?: unknown;
  save(): Promise<void>;
}
const harness: { session: TestSession } = { session: { save: async () => {} } };
Object.assign(globalThis, { oauthHandlersTestHarness: harness });

function stub(source: string): string {
  return `data:text/javascript,${encodeURIComponent(`const h = globalThis.oauthHandlersTestHarness;\n${source}`)}`;
}

const STUBS: Record<string, string> = {
  next: stub('export const NextApiHandler = undefined, NextApiRequest = undefined, NextApiResponse = undefined;'),
  'iron-session': stub('export const getIronSession = async () => h.session;'),
  '@smart-signer/lib/session': stub('export const sessionOptions = {};'),
  '@smart-signer/types/common': stub('export const IronSessionData = undefined, OAuthState = undefined;'),
  '@hive/ui/config/site': stub(`export const siteConfig = { url: '${SITE_URL}' };`),
  '@smart-signer/lib/get-hive-user-profile': stub(
    'export const getHiveUserProfile = async () => ({ name: "Alice <b>A.</b>", picture: "" });'
  ),
  '@hive/ui/lib/logging': stub('export const getLogger = () => ({ info() {}, error() {} });'),
  '@hive/ui/lib/proxify-images': stub('export const proxifyImageSrc = (src) => src;'),
  '@hive/ui/lib/site-url': stub('export const joinSiteUrl = (base, path) => new URL(path, base);'),
  '@smart-signer/lib/oauth/return-url': stub('export const buildOAuthReturnUrl = () => null;'),
  '@smart-signer/lib/auth/accounts': stub('export const setSessionUser = (session, user) => { session.user = user; };'),
  '@hive/ui/config/public-vars': stub('export const configuredImagesEndpoint = "https://images.example.org";')
};
const RELATIVE = new Set(['./config', './jwt-utils']);
// handlers.ts imports the OAuthError interface as a value, which type stripping leaves in
const VALIDATE_WITH_TYPES = `data:text/javascript,${encodeURIComponent(
  `export * from '${new URL('./validate.ts', import.meta.url).href}'; export const OAuthError = undefined;`
)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    if (specifier === './validate') return { url: VALIDATE_WITH_TYPES, shortCircuit: true };
    if (RELATIVE.has(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD = 'a-cookie-password-of-at-least-32-characters';
process.env.DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET = 'rocket-chat-secret';
process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET = MATRIX_SECRET;
process.env.REACT_APP_MATRIX_HOMESERVER_URL = 'https://matrix.example.org';
const { handleAuthorize, handleToken, handleUserInfo } = await import('./handlers.ts');

interface Recorded {
  status: number;
  body?: Record<string, string>;
  location?: string;
}

async function call(
  handler: (req: never, res: never) => unknown,
  req: { query?: Record<string, string>; body?: Record<string, string>; headers?: Record<string, string> }
): Promise<Recorded> {
  const recorded: Recorded = { status: 200 };
  const res = {
    setHeader() {},
    status(code: number) {
      recorded.status = code;
      return res;
    },
    json(body: Record<string, string>) {
      recorded.body = body;
    },
    redirect(code: number, location: string) {
      recorded.status = code;
      recorded.location = location;
    }
  };
  await handler({ query: {}, body: {}, headers: {}, ...req } as never, res as never);
  return recorded;
}

const synapseAuthorize = (overrides: Record<string, string> = {}) =>
  call(handleAuthorize, {
    query: {
      response_type: 'code',
      client_id: 'matrix',
      redirect_uri: CALLBACK,
      scope: 'profile',
      state: 'synapse-state',
      ...overrides
    }
  });

const basic = (clientId: string, secret: string) =>
  `Basic ${Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`).toString('base64')}`;

const synapseToken = (code: string, authorization = basic('matrix', MATRIX_SECRET)) =>
  call(handleToken, {
    headers: { authorization },
    body: { grant_type: 'authorization_code', code, redirect_uri: CALLBACK }
  });

async function issuedCode(): Promise<string> {
  const { location } = await synapseAuthorize();
  const code = location && new URL(location).searchParams.get('code');
  assert.ok(code, `no code in ${location}`);
  return code;
}

beforeEach(() => {
  harness.session = {
    user: { isLoggedIn: true, username: 'alice', authenticateOnBackend: true },
    save: async () => {}
  };
});

describe('the matrix client', () => {
  it("authorize redirects a signed-in user straight back to Synapse's callback with a code and the state", async () => {
    const { status, location } = await synapseAuthorize();
    assert.equal(status, 302);
    const url = new URL(location ?? '');
    assert.equal(`${url.origin}${url.pathname}`, CALLBACK);
    assert.equal(url.searchParams.get('state'), 'synapse-state');
    assert.ok(url.searchParams.get('code'));
    assert.equal(harness.session.user?.oauthConsent?.matrix, true);
  });

  it('authorize refuses a redirect URI the client was not configured with', async () => {
    const { status, body, location } = await synapseAuthorize({
      redirect_uri: 'https://evil.example.org/_synapse/client/oidc/callback'
    });
    assert.equal(status, 400);
    assert.equal(body?.error, 'invalid_request');
    assert.equal(location, undefined);
  });

  it('authorize sends a user who is not signed in to the login page', async () => {
    harness.session.user = undefined;
    const { status, location } = await synapseAuthorize();
    assert.equal(status, 302);
    assert.equal(new URL(location ?? '').pathname, '/login');
  });

  it('token exchanges the code for a bearer token with client_secret_basic', async () => {
    const { status, body } = await synapseToken(await issuedCode());
    assert.equal(status, 200);
    assert.equal(body?.token_type, 'Bearer');
    assert.equal(body?.scope, 'profile');
    assert.ok(body?.access_token);
  });

  it("token refuses a wrong secret, and the Rocket.Chat client's credentials for a matrix code", async () => {
    const code = await issuedCode();
    assert.equal((await synapseToken(code, basic('matrix', 'wrong'))).status, 401);
    const asRocketChat = await synapseToken(code, basic('denser', 'rocket-chat-secret'));
    assert.equal(asRocketChat.status, 400);
    assert.equal(asRocketChat.body?.error, 'invalid_grant');
  });

  it('userinfo names the Hive account as sub and preferred_username', async () => {
    const accessToken = (await synapseToken(await issuedCode())).body?.access_token;
    const { status, body } = await call(handleUserInfo, { headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal(status, 200);
    assert.equal(body?.sub, 'alice');
    assert.equal(body?.preferred_username, 'alice');
    assert.equal(body?.name, 'Alice A.');
  });
});
