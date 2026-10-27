import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { User } from '@smart-signer/types/common';

const CHAT_API = 'https://chat.test/api/v1';
const HOMESERVER = 'https://matrix.test';
const MATRIX_ADMIN_TOKEN = 'syt_matrix_admin';

/** What the stand-in modules below read and record; they cannot import the test. */
interface Harness {
  session: { user?: User; accounts?: User[]; destroyed: boolean; destroy(): void };
  errors: unknown[][];
  /** The chat settings the site config reads at sign-out */
  chat: { provider: string; matrixAdminToken: string };
}
const harness: Harness = {
  session: { destroyed: false, destroy() {} },
  errors: [],
  chat: { provider: 'rocketchat', matrixAdminToken: '' }
};
Object.assign(globalThis, { logoutTestHarness: harness });

function stub(source: string): string {
  return `data:text/javascript,${encodeURIComponent(`const h = globalThis.logoutTestHarness;\n${source}`)}`;
}

const STUBS: Record<string, string> = {
  'iron-session': stub('export const getIronSession = async () => h.session;'),
  '@smart-signer/lib/session': stub('export const sessionOptions = {};'),
  '@smart-signer/lib/auth/default-user': stub('export const defaultUser = { isLoggedIn: false, username: "" };'),
  '@smart-signer/lib/csrf-protection': stub('export const checkCsrfHeader = () => {};'),
  '@smart-signer/lib/oidc': stub('export const oidc = undefined;'),
  '@smart-signer/lib/event-logging': stub(
    'export const logLogoutEvent = () => {}; export const getClientIpFromApiRequest = () => "";'
  ),
  '@smart-signer/lib/account-info-cookie': stub('export const clearAccountInfoCookie = () => {};'),
  '@ui/lib/logging': stub(
    'export const getLogger = () => ({ info() {}, error: (...args) => h.errors.push(args) });'
  ),
  '@hive/ui/lib/logging': stub(
    'export const getLogger = () => ({ info() {}, error: (...args) => h.errors.push(args) });'
  ),
  '@ui/config/site': stub(
    `export const siteConfig = {
      openhiveChatApiUri: '${CHAT_API}', openhiveChatAdminUserId: 'admin-id', openhiveChatAdminUserToken: 'admin-token',
      get chatProvider() { return h.chat.provider; },
      get matrixAdminToken() { return h.chat.matrixAdminToken; },
      matrixChat: { homeserverUrl: '${HOMESERVER}', serverName: 'matrix.test' }
    };`
  )
};
const REAL: Record<string, string> = {
  '@smart-signer/lib/auth/chat-session': '../../auth/chat-session.ts',
  '@smart-signer/lib/auth/accounts': '../../auth/accounts.ts',
  '@smart-signer/lib/auth/chat-session-ender': '../../auth/chat-session-ender.ts',
  '@smart-signer/lib/auth/matrix-devices': '../../auth/matrix-devices.ts',
  '@smart-signer/lib/rocket-chat': '../../rocket-chat.ts',
  '@smart-signer/lib/fetch-json': '../../fetch-json.ts',
  '@ui/config/chat': '../../../../ui/config/chat.ts',
  './fetch-json': './fetch-json.ts'
};

// Under node's type stripping the `@smart-signer/` alias does not resolve
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    if (REAL[specifier]) {
      const base = specifier.startsWith('./') ? context.parentURL : import.meta.url;
      return { url: new URL(REAL[specifier], base).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});

const { logoutUser } = await import('./logout.ts');

function account(username: string, chatAuthToken: string): User {
  return {
    isLoggedIn: true,
    username,
    avatarUrl: '',
    loginType: 'keychain' as User['loginType'],
    keyType: 'posting' as User['keyType'],
    authenticateOnBackend: true,
    chatAuthToken,
    oauthConsent: { openhive_chat: true },
    strict: true
  };
}

interface ChatCall {
  url: string;
  method: string;
  headers: Record<string, string>;
}

/** Stands in Rocket.Chat; `logout` answers as `answerLogout` says. */
function chatServer(answerLogout: () => Promise<Response>): ChatCall[] {
  const calls: ChatCall[] = [];
  mock.method(globalThis, 'fetch', (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, method: init.method ?? 'GET', headers: { ...(init.headers as Record<string, string>) } });
    if (url.startsWith(`${CHAT_API}/users.info`)) {
      return Promise.resolve(Response.json({ success: true, user: { _id: 'rc-alice', active: true } }));
    }
    return answerLogout();
  });
  return calls;
}

async function signOut(): Promise<unknown> {
  let body: unknown;
  const res = { json: (value: unknown) => (body = value) };
  // @ts-expect-error - the handler reads only `cookies` from the request and `json` from the response
  await logoutUser({ cookies: {} }, res);
  return body;
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

describe('logoutUser', () => {
  beforeEach(() => {
    harness.errors = [];
    harness.chat = { provider: 'rocketchat', matrixAdminToken: '' };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  function signedIn(user: User, accounts: User[] = [user]) {
    harness.session = {
      user,
      accounts,
      destroyed: false,
      destroy() {
        this.destroyed = true;
      }
    };
  }

  it("logs the user's chat session out through Rocket.Chat's REST logout, once", async () => {
    const calls = chatServer(() => Promise.resolve(Response.json({ status: 'success' })));
    signedIn(account('alice', 'token-a'));

    assert.deepEqual(await signOut(), { isLoggedIn: false, username: '', chatSessionsEnded: true });

    assert.equal(harness.session.destroyed, true);
    const logouts = calls.filter((call) => call.url === `${CHAT_API}/logout`);
    assert.equal(logouts.length, 1);
    assert.equal(logouts[0].method, 'POST');
    assert.equal(logouts[0].headers['X-User-Id'], 'rc-alice');
    assert.equal(logouts[0].headers['X-Auth-Token'], 'token-a');
    assert.equal(calls[0].headers['X-Auth-Token'], 'admin-token');
    assert.deepEqual(harness.errors, []);
  });

  it('does not call Rocket.Chat for a user who never had chat access', async () => {
    const calls = chatServer(() => Promise.resolve(Response.json({ status: 'success' })));
    signedIn(account('carol', ''));

    assert.deepEqual(await signOut(), { isLoggedIn: false, username: '', chatSessionsEnded: false });

    assert.equal(harness.session.destroyed, true);
    assert.deepEqual(calls, []);
  });

  it('answers once an unreachable Rocket.Chat fails, saying so, and logs the failure without the token', { timeout: 2000 }, async () => {
    let refuse: (error: Error) => void = () => {};
    chatServer(() => new Promise<Response>((_resolve, reject) => (refuse = reject)));
    signedIn(account('alice', 'token-a'));

    const answer = signOut();
    // The logout request is now waiting on Rocket.Chat, which then fails
    await settle();
    assert.equal(harness.session.destroyed, true);
    refuse(new TypeError('fetch failed'));

    assert.deepEqual(await answer, { isLoggedIn: false, username: '', chatSessionsEnded: false });
    assert.equal(harness.errors.length, 1);
    assert.match(String(harness.errors[0][0]), /Rocket\.Chat logout/);
    assert.ok(!JSON.stringify(harness.errors).includes('token-a'));
  });

  describe('in Matrix mode', () => {
    const ALICE_DEVICES = `${HOMESERVER}/_synapse/admin/v2/users/${encodeURIComponent('@alice:matrix.test')}`;

    beforeEach(() => {
      harness.chat = { provider: 'matrix', matrixAdminToken: MATRIX_ADMIN_TOKEN };
    });

    /** Stands in for Synapse's admin API; `answerDelete` answers `delete_devices`. */
    function synapse(answerDelete: () => Promise<Response>) {
      const calls: { url: string; method: string; body: unknown; authorization: string }[] = [];
      mock.method(globalThis, 'fetch', (input: string | URL, init: RequestInit = {}) => {
        const url = String(input);
        calls.push({
          url,
          method: init.method ?? 'GET',
          body: init.body ? JSON.parse(String(init.body)) : undefined,
          authorization: new Headers(init.headers).get('Authorization') ?? ''
        });
        if (url.endsWith('/devices')) {
          return Promise.resolve(Response.json({ devices: [{ device_id: 'D1' }, { device_id: 'D2' }], total: 2 }));
        }
        return answerDelete();
      });
      return calls;
    }

    it("deletes each signed-in account's Matrix devices once, and nothing on Rocket.Chat", async () => {
      const calls = synapse(() => Promise.resolve(Response.json({})));
      const alice = account('alice', '');
      signedIn(alice, [alice, account('bob', '')]);

      assert.deepEqual(await signOut(), { isLoggedIn: false, username: '', chatSessionsEnded: true });

      assert.equal(harness.session.destroyed, true);
      const bobDevices = `${HOMESERVER}/_synapse/admin/v2/users/${encodeURIComponent('@bob:matrix.test')}`;
      assert.deepEqual(
        calls.map(({ url, method, body }) => ({ url, method, body })),
        [
          { url: `${ALICE_DEVICES}/devices`, method: 'GET', body: undefined },
          { url: `${bobDevices}/devices`, method: 'GET', body: undefined },
          { url: `${ALICE_DEVICES}/delete_devices`, method: 'POST', body: { devices: ['D1', 'D2'] } },
          { url: `${bobDevices}/delete_devices`, method: 'POST', body: { devices: ['D1', 'D2'] } }
        ]
      );
      assert.ok(calls.every((call) => call.authorization === `Bearer ${MATRIX_ADMIN_TOKEN}`));
      assert.deepEqual(harness.errors, []);
    });

    it('answers once Synapse fails, saying so, and logs the failure without the admin token', { timeout: 2000 }, async () => {
      let refuse: (response: Response) => void = () => {};
      synapse(() => new Promise<Response>((resolve) => (refuse = resolve)));
      signedIn(account('alice', ''));

      const answer = signOut();
      await settle();
      assert.equal(harness.session.destroyed, true);
      refuse(Response.json({ errcode: 'M_UNKNOWN', error: `bad ${MATRIX_ADMIN_TOKEN}` }, { status: 500 }));

      assert.deepEqual(await answer, { isLoggedIn: false, username: '', chatSessionsEnded: false });
      assert.equal(harness.errors.length, 1);
      assert.match(String(harness.errors[0][0]), /Matrix devices/);
      assert.ok(!JSON.stringify(harness.errors).includes(MATRIX_ADMIN_TOKEN));
    });

    it('calls no chat server without an admin token', async () => {
      harness.chat.matrixAdminToken = '';
      const calls = synapse(() => Promise.resolve(Response.json({})));
      signedIn(account('alice', ''));

      assert.deepEqual(await signOut(), { isLoggedIn: false, username: '', chatSessionsEnded: false });

      assert.equal(harness.session.destroyed, true);
      assert.deepEqual(calls, []);
    });
  });
});
