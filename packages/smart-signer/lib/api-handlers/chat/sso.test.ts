import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { User } from '@smart-signer/types/common';

/** What the stand-in modules below read and record; they cannot import the test. */
interface Harness {
  integrationEnabled: boolean;
  user?: Partial<User>;
  tokenRequests: string[];
}
const harness: Harness = { integrationEnabled: true, tokenRequests: [] };
Object.assign(globalThis, { chatSsoTestHarness: harness });

function stub(source: string): string {
  return `data:text/javascript,${encodeURIComponent(`const h = globalThis.chatSsoTestHarness;\n${source}`)}`;
}

const STUBS: Record<string, string> = {
  'iron-session': stub('export const getIronSession = async () => ({ user: h.user });'),
  '@smart-signer/lib/session': stub('export const sessionOptions = {};'),
  '@hive/ui/lib/logging': stub('export const getLogger = () => ({ info() {}, warn() {}, error() {} });'),
  '@hive/ui/config/site': stub(
    `export const siteConfig = {
      openhiveChatUri: 'https://chat.test', openhiveChatAllowNonStrictLogin: false,
      get openhiveChatIframeIntegrationEnable() { return h.integrationEnabled; }
    };`
  ),
  '@smart-signer/lib/rocket-chat': stub(
    `export const getChatAuthToken = async (username) => {
      h.tokenRequests.push(username);
      return { success: true, data: { authToken: 'rc-token' } };
    };`
  )
};

// Under node's type stripping the `@smart-signer/` alias does not resolve
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { chatSso } = await import('./sso.ts');

async function callSso(): Promise<{ status: number; body: unknown }> {
  const answer = { status: 0, body: undefined as unknown };
  const res = {
    setHeader() {},
    status(code: number) {
      answer.status = code;
      return this;
    },
    json(value: unknown) {
      answer.body = value;
    },
    end() {}
  };
  // @ts-expect-error - the handler reads only `method` from the request and the methods above from the response
  await chatSso({ method: 'GET' }, res);
  return answer;
}

describe('chatSso', () => {
  beforeEach(() => {
    harness.integrationEnabled = true;
    harness.user = { isLoggedIn: true, username: 'alice', strict: true };
    harness.tokenRequests = [];
  });

  it('answers 404 and mints no token when the iframe integration is off', async () => {
    harness.integrationEnabled = false;

    const { status } = await callSso();

    assert.equal(status, 404);
    assert.deepEqual(harness.tokenRequests, []);
  });

  it('returns a login token for a signed-in user when the integration is on', async () => {
    const answer = await callSso();

    assert.deepEqual(answer, { status: 200, body: { loginToken: 'rc-token' } });
    assert.deepEqual(harness.tokenRequests, ['alice']);
  });

  it('answers 401 to a visitor who is not signed in', async () => {
    harness.user = undefined;

    const { status } = await callSso();

    assert.equal(status, 401);
  });
});
