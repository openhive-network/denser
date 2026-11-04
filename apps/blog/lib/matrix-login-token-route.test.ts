import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from '@smart-signer/types/common';
import type { MatrixLoginTokenResult } from '@smart-signer/lib/auth/matrix-login-token';
import type { MatrixLoginTokenRouteSettings } from './matrix-login-token-route.ts';

// Node resolves neither the tsconfig path alias nor an extensionless import:
// point `@smart-signer/…` at the package's TypeScript source.
const SMART_SIGNER_ALIAS = '@smart-signer/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(SMART_SIGNER_ALIAS)) return nextResolve(specifier, context);
    const source = new URL(
      `../../../packages/smart-signer/${specifier.slice(SMART_SIGNER_ALIAS.length)}.ts`,
      import.meta.url
    );
    return nextResolve(source.href, context);
  }
});

const { matrixLoginTokenHandler } = await import('./matrix-login-token-route.ts');

const SAME_ORIGIN = { host: 'denser.example.org', origin: 'https://denser.example.org', 'sec-fetch-site': 'same-origin' };

function signedIn(overrides: Partial<User> = {}): User {
  return {
    isLoggedIn: true,
    username: 'alice',
    avatarUrl: '',
    // Values of LoginType.keychain and KeyType.posting: the enums cannot load under type stripping
    loginType: 'keychain' as User['loginType'],
    keyType: 'posting' as User['keyType'],
    authenticateOnBackend: true,
    chatAuthToken: '',
    oauthConsent: {},
    strict: true,
    ...overrides
  };
}

interface Answered {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
}

function respond(): { res: NextApiResponse; answered: Answered } {
  const answered: Answered = { status: 0, body: undefined, headers: {} };
  const res = {
    setHeader(name: string, value: unknown) {
      answered.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      answered.status = code;
      return res;
    },
    json(body: unknown) {
      answered.body = body;
    }
  };
  return { res: res as unknown as NextApiResponse, answered };
}

/**
 * Calls the route for `user` with `headers` and `body`; resolves to its answer, the users it minted
 * for and whether each mint could create the account.
 */
async function call(
  { user, headers = SAME_ORIGIN, body, ...overrides }: Partial<MatrixLoginTokenRouteSettings> & {
    user?: User;
    headers?: Record<string, string>;
    body?: unknown;
  },
  minted: MatrixLoginTokenResult = { kind: 'token', loginToken: 'syl_login' }
): Promise<Answered & { mintedFor: string[]; creating: boolean[] }> {
  const mintedFor: string[] = [];
  const creating: boolean[] = [];
  const handler = matrixLoginTokenHandler({
    provider: 'matrix',
    minting: true,
    eligibility: { allowNonStrictLogin: false, allowedUsers: [] },
    sessionUser: async () => user,
    mint: async (username, createAccount) => {
      mintedFor.push(username);
      creating.push(createAccount);
      return minted;
    },
    ...overrides
  });
  const { res, answered } = respond();
  await handler({ method: 'POST', headers, body } as unknown as NextApiRequest, res);
  assert.equal(answered.headers['cache-control'], 'no-store');
  return { ...answered, mintedFor, creating };
}

describe('matrixLoginTokenHandler', () => {
  it("answers only the login token minted for the server's signed-in user", async () => {
    const answer = await call({ user: signedIn() });
    assert.deepEqual(answer, {
      status: 200,
      body: { loginToken: 'syl_login' },
      headers: { 'cache-control': 'no-store' },
      mintedFor: ['alice'],
      creating: [false]
    });
  });

  it('lets the mint create the account only when the request asks for it, as an opened chat does', async () => {
    const opened = await call({ user: signedIn(), body: { createAccount: true } });
    assert.equal(opened.status, 200);
    assert.deepEqual(opened.creating, [true]);
    for (const body of [undefined, '', {}, { createAccount: false }, { createAccount: 'true' }, 'createAccount']) {
      const warmUp = await call({ user: signedIn(), body });
      assert.deepEqual(warmUp.creating, [false], JSON.stringify(body));
    }
  });

  it('accepts a same-origin request from a browser without Sec-Fetch-Site, behind a proxy too', async () => {
    const direct = await call({ user: signedIn(), headers: { host: 'denser.example.org', origin: 'https://denser.example.org' } });
    assert.equal(direct.status, 200);
    const proxied = await call({
      user: signedIn(),
      headers: { host: 'blog:3000', 'x-forwarded-host': 'denser.example.org', origin: 'https://denser.example.org' }
    });
    assert.equal(proxied.status, 200);
  });

  it('refuses a cross-origin request', async () => {
    const crossOrigin: Record<string, string>[] = [
      { ...SAME_ORIGIN, 'sec-fetch-site': 'cross-site' },
      { ...SAME_ORIGIN, 'sec-fetch-site': 'same-site' },
      { host: 'denser.example.org', origin: 'https://evil.example.com' },
      { host: 'denser.example.org' }
    ];
    for (const headers of crossOrigin) {
      const answer = await call({ user: signedIn(), headers });
      assert.equal(answer.status, 403, JSON.stringify(headers));
      assert.deepEqual(answer.mintedFor, []);
    }
  });

  it('refuses a user the server has not signed in', async () => {
    for (const user of [undefined, signedIn({ isLoggedIn: false }), signedIn({ authenticateOnBackend: false })]) {
      const answer = await call({ user });
      assert.equal(answer.status, 401);
      assert.deepEqual(answer.mintedFor, []);
    }
  });

  it('refuses a user who may not chat', async () => {
    const nonStrict = await call({ user: signedIn({ strict: false }) });
    assert.equal(nonStrict.status, 403);
    const notListed = await call({
      user: signedIn(),
      eligibility: { allowNonStrictLogin: false, allowedUsers: ['bob'] }
    });
    assert.equal(notListed.status, 403);
    assert.deepEqual([...nonStrict.mintedFor, ...notListed.mintedFor], []);
  });

  it('is not served unless Matrix is the chat provider with an admin token', async () => {
    const rocketChat = await call({ user: signedIn(), provider: 'rocketchat' });
    const noAdminToken = await call({ user: signedIn(), minting: false });
    assert.equal(rocketChat.status, 404);
    assert.equal(noAdminToken.status, 404);
    assert.deepEqual([...rocketChat.mintedFor, ...noAdminToken.mintedFor], []);
  });

  it('answers without a token, for the SSO fallback, for a user Synapse does not know or a failed mint', async () => {
    const unknown = await call({ user: signedIn() }, { kind: 'unknown-user' });
    assert.equal(unknown.status, 404);
    assert.ok(!('loginToken' in Object(unknown.body)));
    const failed = await call({ user: signedIn() }, { kind: 'failed' });
    assert.equal(failed.status, 503);
    assert.ok(!('loginToken' in Object(failed.body)));
  });

  it("passes Synapse's rate limit on as a 429 with retry_after_ms, capped at 70 s", async () => {
    const limited = await call({ user: signedIn() }, { kind: 'rate-limited', retryAfterMs: 41_500 });
    assert.deepEqual(limited, {
      status: 429,
      body: { error: 'Rate-limited', retry_after_ms: 41_500 },
      headers: { 'cache-control': 'no-store', 'retry-after': '42' },
      mintedFor: ['alice'],
      creating: [false]
    });
    const long = await call({ user: signedIn() }, { kind: 'rate-limited', retryAfterMs: 3_600_000 });
    assert.equal(long.status, 429);
    assert.equal(Reflect.get(Object(long.body), 'retry_after_ms'), 70_000);
    assert.equal(long.headers['retry-after'], '70');
  });
});
