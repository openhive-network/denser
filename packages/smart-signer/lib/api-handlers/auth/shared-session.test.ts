import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@smart-signer/types/common';

/**
 * The blog and the wallet on one origin: each app's auth API handlers, run with that app's env
 * (a copy of the modules each), against one browser's cookie jar, with the real iron-session.
 * Only the chain, the signature checks and the chat server are stood in.
 */

interface Harness {
  /** The chat sessions ended, by username */
  ended: string[];
}
const harness: Harness = { ended: [] };
Object.assign(globalThis, { sharedSessionTestHarness: harness });

function stub(source: string): string {
  return `data:text/javascript,${encodeURIComponent(`const h = globalThis.sharedSessionTestHarness;\n${source}`)}`;
}

const LOGGER = 'export const getLogger = () => ({ info() {}, error() {} });';
const STUBS: Record<string, string> = {
  next: stub('export const NextApiHandler = undefined;'),
  '@smart-signer/types/common': stub('export const User = undefined, IronSessionData = undefined;'),
  '@smart-signer/lib/auth/utils': stub(
    `const parsed = { parseAsync: async (body) => body };
    export const postLoginSchema = parsed, postSwitchSchema = parsed, postAccountSchema = parsed;
    export const PostLoginSchema = undefined;`
  ),
  '@smart-signer/lib/csrf-protection': stub('export const checkCsrfHeader = () => {};'),
  '@transaction/lib/hive-api': stub('export const getAccount = async (name) => ({ name, profile: {} });'),
  '@transaction/lib/chain': stub(
    'export const getChain = async () => ({ api: { database_api: { verify_authority: async () => ({}) } } });'
  ),
  '@smart-signer/lib/verify-login-challenge': stub('export const verifyLoginChallenge = async () => false;'),
  '@smart-signer/lib/verify-login': stub('export const verifyLogin = async () => ({ isLoggedIn: true, strict: true });'),
  '@smart-signer/lib/login-operation': stub('export const getLoginChallengeFromTransactionForLogin = (tx) => tx.challenge;'),
  '@hive/ui/lib/logging': stub(LOGGER),
  '@ui/lib/logging': stub(LOGGER),
  '@hive/ui/config/site': stub('export const siteConfig = { chatProvider: "matrix" };'),
  '@smart-signer/lib/rocket-chat': stub('export const getChatAuthToken = async () => ({ success: false });'),
  '@smart-signer/lib/event-logging': stub(
    'export const logLoginEvent = () => {}, logLogoutEvent = () => {}, getClientIpFromApiRequest = () => "";'
  ),
  '@smart-signer/lib/oidc': stub('export const oidc = undefined;'),
  '@smart-signer/lib/auth/default-user': stub('export const defaultUser = { isLoggedIn: false, username: "" };'),
  // Matrix: a user's chat session is their devices, ended with the admin token
  '@smart-signer/lib/auth/chat-session-ender': stub(
    `export const chatSessionEnder = () => ({
      sessionOf: (user) => user.username,
      end: async (user) => { h.ended.push(user.username); return true; }
    });`
  )
};
const REAL: Record<string, string> = {
  '@smart-signer/lib/session': '../../session.ts',
  '@smart-signer/lib/set-cookie': '../../set-cookie.ts',
  '@smart-signer/lib/account-info-cookie': '../../account-info-cookie.ts',
  '@smart-signer/lib/session-uid-cookie': '../../session-uid-cookie.ts',
  '@smart-signer/lib/auth/accounts': '../../auth/accounts.ts',
  '@smart-signer/lib/auth/chat-session': '../../auth/chat-session.ts',
  '@smart-signer/lib/api-handlers/auth/challenge': './challenge.ts',
  './set-cookie': '../../set-cookie.ts'
};

// Under node's type stripping the aliases do not resolve. A module keeps the query of the app
// that imported it, so each app's `session.ts` reads that app's env.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    const path = REAL[specifier];
    if (!path) return nextResolve(specifier, context);
    const app = context.parentURL ? new URL(context.parentURL).search : '';
    return { url: `${new URL(path, import.meta.url).href}${app}`, shortCircuit: true };
  }
});

interface AppHandlers {
  challenge: NextApiHandler;
  login: NextApiHandler;
  user: NextApiHandler;
  switchAccount: NextApiHandler;
  logout: NextApiHandler;
}

const PASSWORD = 'shared-session-test-cookie-password-not-a-secret';
let loads = 0;

/** The auth API routes of an app started with APP_NAME `appName` and the cookie `prefix` */
async function startApp(appName: string, prefix: string | undefined): Promise<AppHandlers> {
  process.env.REACT_APP_APP_NAME = appName;
  process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD = PASSWORD;
  if (prefix === undefined) delete process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX;
  else process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX = prefix;
  const app = `?${appName}-${++loads}`;
  const [{ issueLoginChallenge }, { loginUser }, { getUser }, { switchAccount }, { logoutUser }] = await Promise.all([
    import(`./challenge.ts${app}`),
    import(`./login.ts${app}`),
    import(`../users/me.ts${app}`),
    import(`./accounts.ts${app}`),
    import(`./logout.ts${app}`)
  ]);
  return { challenge: issueLoginChallenge, login: loginUser, user: getUser, switchAccount, logout: logoutUser };
}

/** One browser's cookies for the origin, every one with `Path=/` */
class CookieJar {
  private readonly cookies = new Map<string, string>();

  header(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  store(setCookies: string[]): void {
    for (const setCookie of setCookies) {
      const [pair, ...attributes] = setCookie.split(';').map((part) => part.trim());
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const expired = attributes.some((attribute) => /^max-age=0$/i.test(attribute));
      if (expired || !value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
}

interface Answer {
  status: number;
  body: unknown;
}

async function call(jar: CookieJar, handler: NextApiHandler, body?: unknown): Promise<Answer> {
  const cookie = jar.header();
  const req = {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie },
    cookies: Object.fromEntries(cookie ? cookie.split('; ').map((pair) => pair.split(/=(.*)/s, 2)) : []),
    body
  };
  const headers = new Map<string, string | string[]>();
  const answer: Answer = { status: 200, body: undefined };
  const res = {
    headersSent: false,
    getHeader: (name: string) => headers.get(name.toLowerCase()),
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
      return res;
    },
    json(value: unknown) {
      answer.body = value;
    }
  };
  try {
    // The handlers read the cookies, headers and body of the request and set headers and a JSON body
    await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
  } catch (error) {
    answer.status = (error as { status?: number }).status ?? 500;
  }
  jar.store([headers.get('set-cookie') ?? []].flat());
  return answer;
}

/** Signs `username` in through `app`'s login dialog, authenticating on the server */
async function signIn(jar: CookieJar, app: AppHandlers, username: string): Promise<Answer> {
  const { body } = await call(jar, app.challenge);
  const { loginChallenge } = body as { loginChallenge: string };
  const tx = { challenge: loginChallenge, operations: [{ value: { required_posting_auths: [username] } }] };
  return call(jar, app.login, {
    username,
    loginType: 'keychain',
    keyType: 'posting',
    authenticateOnBackend: true,
    signatures: {},
    txJSON: JSON.stringify(tx),
    pack: 'hf26'
  });
}

const usernameOf = (answer: Answer) => (answer.body as User | undefined)?.username;

describe('blog and wallet on one origin', () => {
  let jar: CookieJar;

  beforeEach(() => {
    jar = new CookieJar();
    harness.ended = [];
  });

  afterEach(() => {
    delete process.env.REACT_APP_APP_NAME;
    delete process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX;
    delete process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD;
  });

  describe('with one session cookie prefix', () => {
    let blog: AppHandlers;
    let wallet: AppHandlers;

    beforeEach(async () => {
      blog = await startApp('blog', 'denser_');
      wallet = await startApp('wallet', 'denser_');
    });

    it('a sign-in through the wallet signs the blog in on its server', async () => {
      assert.equal((await signIn(jar, wallet, 'alice')).status, 200);
      const answer = await call(jar, blog.user);
      assert.equal(answer.status, 200);
      assert.deepEqual(
        { isLoggedIn: (answer.body as User).isLoggedIn, username: usernameOf(answer) },
        { isLoggedIn: true, username: 'alice' }
      );
    });

    it('the blog switches to an account added through the wallet and keeps it', async () => {
      await signIn(jar, blog, 'alice');
      await signIn(jar, wallet, 'bob');

      const toAlice = await call(jar, blog.switchAccount, { username: 'alice', authenticateOnBackend: true });
      assert.deepEqual([toAlice.status, usernameOf(toAlice)], [200, 'alice']);
      const toBob = await call(jar, blog.switchAccount, { username: 'bob', authenticateOnBackend: true });
      assert.deepEqual([toBob.status, usernameOf(toBob)], [200, 'bob']);

      // The wallet's server sees the blog's switch, and both accounts are still signed in
      assert.equal(usernameOf(await call(jar, wallet.user)), 'bob');
      const backToAlice = await call(jar, wallet.switchAccount, { username: 'alice', authenticateOnBackend: true });
      assert.deepEqual([backToAlice.status, usernameOf(backToAlice)], [200, 'alice']);
    });

    it('a sign-out in either app ends the shared session and its chat sessions once', async () => {
      await signIn(jar, blog, 'alice');
      await signIn(jar, wallet, 'bob');
      harness.ended = [];

      const signedOut = await call(jar, wallet.logout, {});
      assert.equal((signedOut.body as { chatSessionsEnded: boolean }).chatSessionsEnded, true);
      assert.equal(usernameOf(await call(jar, blog.user)), '');
      // The blog tab hears of the sign-out and signs out too: the session is already gone
      await call(jar, blog.logout, {});
      assert.deepEqual(harness.ended.toSorted(), ['alice', 'bob']);
    });
  });

  it('without a prefix each app keeps its own session, as on separate hosts', async () => {
    const blog = await startApp('blog', undefined);
    const wallet = await startApp('wallet', undefined);
    await signIn(jar, wallet, 'alice');
    assert.equal(usernameOf(await call(jar, wallet.user)), 'alice');
    assert.equal(usernameOf(await call(jar, blog.user)), '');
    const switched = await call(jar, blog.switchAccount, { username: 'alice', authenticateOnBackend: true });
    assert.equal(switched.status, 401);
  });
});
