import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { NextApiRequest, NextApiResponse } from 'next';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/session': `data:text/javascript,${encodeURIComponent('export const cookieNamePrefix = "blog_";')}`,
  '@smart-signer/lib/set-cookie': new URL('../../set-cookie.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (MODULES[specifier]) return { url: MODULES[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { issueLoginChallenge, LOGIN_CHALLENGE_COOKIE } = await import('./challenge.ts');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Answer {
  headers: Record<string, string | string[]>;
  body: unknown;
}

async function requestChallenge(cookies: Record<string, string> = {}): Promise<Answer> {
  const answer: Answer = { headers: {}, body: undefined };
  const res = {
    getHeader: (name: string) => answer.headers[name.toLowerCase()],
    setHeader(name: string, value: string | string[]) {
      answer.headers[name.toLowerCase()] = value;
      return this;
    },
    json(body: unknown) {
      answer.body = body;
    }
  };
  // The handler reads only the cookies of the request and writes only headers and a JSON body
  await issueLoginChallenge({ cookies } as unknown as NextApiRequest, res as unknown as NextApiResponse);
  return answer;
}

const setCookies = (answer: Answer): string[] => [answer.headers['set-cookie'] ?? []].flat();

describe('GET /api/auth/challenge', () => {
  test('a browser without a challenge gets a new one, as an HttpOnly cookie and in the body', async () => {
    const answer = await requestChallenge();
    const { loginChallenge } = answer.body as { loginChallenge: string };
    assert.match(loginChallenge, UUID);
    assert.equal(LOGIN_CHALLENGE_COOKIE, 'blog_login_challenge_server');
    const [cookie, ...others] = setCookies(answer);
    assert.deepEqual(others, []);
    assert.equal(cookie.split(';')[0], `blog_login_challenge_server=${loginChallenge}`);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /; Path=\//);
    assert.match(cookie, /; SameSite=Lax/);
  });

  test('is never cached', async () => {
    assert.equal((await requestChallenge()).headers['cache-control'], 'no-store');
    const existing = { [LOGIN_CHALLENGE_COOKIE]: crypto.randomUUID() };
    assert.equal((await requestChallenge(existing)).headers['cache-control'], 'no-store');
  });

  test('a browser that holds a challenge gets the same one back and no new cookie', async () => {
    const current = crypto.randomUUID();
    const answer = await requestChallenge({ [LOGIN_CHALLENGE_COOKIE]: current });
    assert.deepEqual(answer.body, { loginChallenge: current });
    assert.deepEqual(setCookies(answer), []);
  });

  test('a cookie that is not a challenge the server issued is replaced', async () => {
    const answer = await requestChallenge({ [LOGIN_CHALLENGE_COOKIE]: 'chosen-by-the-page' });
    const { loginChallenge } = answer.body as { loginChallenge: string };
    assert.match(loginChallenge, UUID);
    assert.equal(setCookies(answer)[0].split(';')[0], `blog_login_challenge_server=${loginChallenge}`);
  });

  test('two browsers get different challenges', async () => {
    const first = (await requestChallenge()).body as { loginChallenge: string };
    const second = (await requestChallenge()).body as { loginChallenge: string };
    assert.notEqual(first.loginChallenge, second.loginChallenge);
  });

  test('clears the JS-readable challenge cookie a browser still holds', async () => {
    const current = crypto.randomUUID();
    const answer = await requestChallenge({ [LOGIN_CHALLENGE_COOKIE]: current, blog_login_challenge: current });
    const [cleared, ...others] = setCookies(answer);
    assert.deepEqual(others, []);
    assert.match(cleared, /^blog_login_challenge=;/);
    assert.match(cleared, /; Max-Age=0/);
    assert.match(cleared, /; Path=\//);
  });
});
