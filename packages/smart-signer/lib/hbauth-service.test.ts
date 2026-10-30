import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * The hb-auth service of common-hiveio-packages stood in by one recording the logouts it is asked
 * for (fakeHbAuthLogouts); its own suite covers which workers they lock.
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
  '@ui/lib/logging': 'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });'
};
// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/auth/other-tab-logout': './auth/other-tab-logout.ts',
  '@smart-signer/lib/auth/account-sync': './auth/account-sync.ts'
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier];
    if (stub !== undefined) return { url: `data:text/javascript,${encodeURIComponent(stub)}`, shortCircuit: true };
    const module = MODULES[specifier];
    if (module !== undefined) return nextResolve(module, context);
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

const fake = globalThis as typeof globalThis & { fakeHbAuthLogouts: string[] };
const { notifyOtherTabLogout } = await import('./auth/other-tab-logout.ts');
await import('./hbauth-service.ts');

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
