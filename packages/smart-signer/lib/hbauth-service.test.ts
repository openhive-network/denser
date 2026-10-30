import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * The hb-auth service of common-hiveio-packages stood in by one recording the logouts it is asked
 * for (fakeHbAuthLogouts), as is a new sign-out epoch ('epoch'); its own suite covers which workers
 * they lock. An account's signer ends its session by logging it out of every worker, as the hb-auth
 * signer does. The stored accounts are fakeStoredAccounts.
 */
const FAKE_HB_AUTH_SERVICE = `
globalThis.fakeHbAuthLogouts = [];
const record = (call) => { globalThis.fakeHbAuthLogouts.push(call); return Promise.resolve(); };
export const getOnlineClient = () => record('getOnlineClient');
export const getOfflineClient = () => record('getOfflineClient');
export const withOnlineClient = () => record('withOnlineClient');
export const logoutFromEveryWorker = (username) => record('every:' + username);
export const logoutFromStartedWorkers = (username) => record('started:' + username);
export const logoutEveryoneFromStartedWorkers = () => record('started:everyone');
`;
const STUBS: Record<string, string> = {
  '@hive/common-hiveio-packages': FAKE_HB_AUTH_SERVICE,
  '@hive/common-hiveio-packages/sign-out-epoch':
    "export const advanceSignOutEpoch = () => { globalThis.fakeHbAuthLogouts.push('epoch'); };",
  '@ui/lib/logging': 'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });',
  '@ui/lib/app-api-path': 'export const appApiPath = (path) => path;',
  '@tanstack/react-query': 'export const useMutation = (options) => options; export const useQueryClient = () => ({});',
  '@smart-signer/types/common': 'export let User;',
  '@smart-signer/lib/auth/utils': 'export let PostSwitchSchema;',
  '@smart-signer/lib/csrf-protection': "export const csrfHeaderName = 'x-csrf';",
  '@smart-signer/lib/auth/user-localstore': 'export const getAccounts = () => globalThis.fakeStoredAccounts;',
  '@smart-signer/lib/auth/active-user':
    'export const setAccounts = (_queryClient, accounts) => { globalThis.fakeStoredAccounts = accounts; }; export const setActiveUser = () => {};',
  '@smart-signer/lib/auth/destroy-signer':
    "import { logoutFromEveryWorker } from '@hive/common-hiveio-packages'; export const destroyAccountSigner = (account) => logoutFromEveryWorker(account.username);"
};
// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/auth/logout-notice': new URL('./auth/logout-notice.ts', import.meta.url).href,
  '@smart-signer/lib/auth/account-sync': new URL('./auth/account-sync.ts', import.meta.url).href,
  '@smart-signer/lib/auth/accounts': new URL('./auth/accounts.ts', import.meta.url).href,
  '@smart-signer/lib/auth/forget-account': new URL('./auth/forget-account.ts', import.meta.url).href,
  '@smart-signer/lib/fetch-json': new URL('./fetch-json.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier];
    if (stub !== undefined) return { url: `data:text/javascript,${encodeURIComponent(stub)}`, shortCircuit: true };
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

/** BroadcastChannel delivering to the other channels of its name, as another tab's are; keeps no process alive */
class FakeBroadcastChannel extends EventTarget {
  static readonly open = new Set<FakeBroadcastChannel>();
  readonly name: string;
  constructor(name: string) {
    super();
    this.name = name;
    FakeBroadcastChannel.open.add(this);
  }
  postMessage(data: unknown) {
    for (const channel of FakeBroadcastChannel.open) {
      if (channel !== this && channel.name === this.name) channel.dispatchEvent(new MessageEvent('message', { data }));
    }
  }
  close() {
    FakeBroadcastChannel.open.delete(this);
  }
}
Object.assign(globalThis, { window: globalThis, BroadcastChannel: FakeBroadcastChannel });

interface StoredAccount {
  username: string;
}
const fake = globalThis as typeof globalThis & { fakeHbAuthLogouts: string[]; fakeStoredAccounts: StoredAccount[] };
const { notifyOtherTabLogout, notifyOwnLogout } = await import('./auth/logout-notice.ts');
await import('./hbauth-service.ts');
// Called as the stubbed useMutation is: it returns the mutation's options
const { useSwitchAccount: switchAccountMutation } = await import('./auth/use-switch-account.ts');
const { FetchError } = await import('./fetch-json.ts');

/** Lets the logouts the notices start, which are not awaited, settle */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("the hb-auth service on another tab's sign-out", () => {
  it('locks every account in the workers this page started, whichever accounts this page knew of', async () => {
    fake.fakeHbAuthLogouts = [];

    notifyOtherTabLogout();
    await settle();

    assert.deepEqual(fake.fakeHbAuthLogouts, ['started:everyone']);
  });

  it('locks the account another tab removed in the workers this page started', async () => {
    fake.fakeHbAuthLogouts = [];
    const otherTab = new BroadcastChannel('denser-accounts');

    otherTab.postMessage({ type: 'accounts-changed', removedUsername: 'bob' });
    otherTab.postMessage({ type: 'accounts-changed' });
    otherTab.postMessage({ type: 'accounts-changed', removedUsername: 42 });
    await settle();

    assert.deepEqual(fake.fakeHbAuthLogouts, ['started:bob']);
    otherTab.close();
  });
});

describe("the hb-auth service on this tab's sign-out", () => {
  it('starts a new sign-out epoch, then locks every account in the workers this page started', async () => {
    fake.fakeHbAuthLogouts = [];

    notifyOwnLogout();
    await settle();

    assert.deepEqual(fake.fakeHbAuthLogouts, ['epoch', 'started:everyone']);
  });
});

describe('a switch to an account the server session lost', () => {
  type SwitchOptions = { onError: (error: unknown, variables: { username: string }) => void };
  const switchOptions = () => switchAccountMutation() as unknown as SwitchOptions;
  const failure = (status: number) =>
    new FetchError({ message: 'switch failed', response: new Response(null, { status }), data: { error: 'switch failed' } });

  it("drops the account, locks it, and names it to the other tabs, whose apps' workers lock it too", async () => {
    fake.fakeHbAuthLogouts = [];
    fake.fakeStoredAccounts = [{ username: 'alice' }, { username: 'bob' }];
    const otherTab = new BroadcastChannel('denser-accounts');
    const heard: unknown[] = [];
    otherTab.addEventListener('message', (event) => heard.push((event as MessageEvent).data));

    switchOptions().onError(failure(401), { username: 'bob' });
    await settle();

    assert.deepEqual(fake.fakeStoredAccounts, [{ username: 'alice' }]);
    assert.deepEqual(fake.fakeHbAuthLogouts, ['every:bob']);
    assert.deepEqual(heard, [{ type: 'accounts-changed', removedUsername: 'bob' }]);
    otherTab.close();
  });

  it('keeps the account when the switch failed for another reason', async () => {
    fake.fakeHbAuthLogouts = [];
    fake.fakeStoredAccounts = [{ username: 'alice' }, { username: 'bob' }];

    switchOptions().onError(failure(500), { username: 'bob' });
    await settle();

    assert.deepEqual(fake.fakeStoredAccounts, [{ username: 'alice' }, { username: 'bob' }]);
    assert.deepEqual(fake.fakeHbAuthLogouts, []);
  });
});
