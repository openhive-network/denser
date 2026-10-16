import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * hb-auth stood in by clients sharing one worker per worker URL, as a SharedWorker is shared: each
 * worker keeps the users unlocked in it.
 */
const FAKE_HB_AUTH = `
const workers = new Map();
globalThis.fakeHbAuthWorkers = workers;
export const DEFAULT_INIT_TIMEOUT = 30000;
export class OnlineClient {
  constructor(options) { this.options = options; }
  get worker() {
    if (!workers.has(this.options.workerUrl)) workers.set(this.options.workerUrl, { unlocked: new Set() });
    return workers.get(this.options.workerUrl);
  }
  async initialize() { this.worker; return this; }
  async register(username) { this.worker.unlocked.add(username); return { ok: true }; }
  async authenticate(username) { this.worker.unlocked.add(username); return { ok: true }; }
  async importKey() { return 'STM-public-key'; }
  async invalidateExistingKey() {}
  async lock() {
    if (!this.worker.unlocked.size) throw new Error('There is no existing user session');
    this.worker.unlocked.clear();
  }
}
export class OfflineClient extends OnlineClient {}
`;
const SILENT_LOGGER = 'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });';
const STUBS: Record<string, string> = {
  '@hiveio/hb-auth': FAKE_HB_AUTH,
  '@hive/ui/lib/logging': SILENT_LOGGER,
  './logging': SILENT_LOGGER,
  '@hive/ui/config/public-vars': 'export const configuredSessionTime = 900;',
  '@beam-australia/react-env': 'export default (name) => globalThis.fakeEnv[name];',
  '../wax': 'export const getChain = async () => ({});'
};
const MODULES: Record<string, string> = {
  '@hive/ui/lib/storage-with-ttl': new URL('../../../ui/lib/storage-with-ttl.ts', import.meta.url).href,
  './safe-storage-generation': new URL('./safe-storage-generation.ts', import.meta.url).href
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

class MemoryStorage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}

interface FakeWorker {
  unlocked: Set<string>;
}

const storage = new MemoryStorage();
const fakeEnv: Record<string, string> = {};
Object.assign(globalThis, {
  window: Object.assign(new EventTarget(), { localStorage: storage, location: { origin: 'https://hive.blog' } }),
  fakeEnv
});

const BLOG = '/blog';
const WALLET = '/wallet';

type HbAuthService = typeof import('./hbauth-service.ts');
let pageCount = 0;

/** A page of the app at `basePath`: a module instance of its own, as a reload or another tab has */
async function openPage(basePath: string) {
  const service: HbAuthService = await import(`./hbauth-service.ts?page=${++pageCount}`);
  const onPage = <T>(action: () => Promise<T>): Promise<T> => {
    fakeEnv.BASE_PATH = basePath;
    return action();
  };
  return {
    getOnlineClient: () => onPage(() => service.getOnlineClient()),
    register: (username: string) =>
      onPage(async () => (await service.getOnlineClient()).register(username, 'password', 'wif', 'posting')),
    importKey: (username: string) =>
      onPage(async () => (await service.getOnlineClient()).importKey(username, 'wif', 'active'))
  };
}

/** The worker URL a client of the stand-in hb-auth was created with, and its worker */
function workerOf(client: unknown): { url: string; worker: FakeWorker } {
  const { options, worker } = client as { options: { workerUrl: string }; worker: FakeWorker };
  return { url: options.workerUrl, worker };
}

/** Lets the replaced client's lock, which is not awaited, settle */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('hb-auth online client', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('starts no generation when there is none, so apps loading together keep their workers', async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);

    const blogClient = await blog.getOnlineClient();
    const walletClient = await wallet.getOnlineClient();

    assert.equal(workerOf(blogClient).url, 'https://hive.blog/blog/auth/worker.js');
    assert.equal(workerOf(walletClient).url, 'https://hive.blog/wallet/auth/worker.js');
    assert.equal(await blog.getOnlineClient(), blogClient);
    assert.equal(await wallet.getOnlineClient(), walletClient);
    assert.equal(storage.length, 0);
  });

  it("keeps the writer's page, its reloads and other tabs on its worker, unlocked", async () => {
    const page = await openPage(BLOG);
    const client = await page.getOnlineClient();

    await page.register('alice');
    await page.importKey('alice');
    await settle();

    assert.equal(await page.getOnlineClient(), client);
    const reloaded = await openPage(BLOG);
    const { url, worker } = workerOf(await reloaded.getOnlineClient());
    assert.equal(url, workerOf(client).url);
    assert.deepEqual([...worker.unlocked], ['alice']);
  });

  it("gives a page whose worker predates another app's write a fresh worker, and locks the replaced one", async () => {
    const blog = await openPage(BLOG);
    await blog.register('alice');
    const staleClient = await blog.getOnlineClient();
    const wallet = await openPage(WALLET);

    await wallet.importKey('alice');
    const freshClient = await blog.getOnlineClient();
    await settle();

    const stale = workerOf(staleClient);
    const fresh = workerOf(freshClient);
    assert.notEqual(fresh.url, stale.url);
    assert.match(fresh.url, /^https:\/\/hive\.blog\/blog\/auth\/worker\.js\?storage=/);
    assert.deepEqual([...fresh.worker.unlocked], []);
    assert.deepEqual([...stale.worker.unlocked], []);
    const otherBlogTab = await openPage(BLOG);
    assert.equal((workerOf(await otherBlogTab.getOnlineClient())).url, fresh.url);
  });

  it("keeps the writing app's worker after another app moved to the new generation", async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);
    const walletClient = await wallet.getOnlineClient();
    await blog.register('alice');

    await wallet.register('alice');
    const blogClient = await blog.getOnlineClient();
    await blog.register('alice');

    assert.equal(await blog.getOnlineClient(), blogClient);
    assert.notEqual(await wallet.getOnlineClient(), walletClient);
  });
});
