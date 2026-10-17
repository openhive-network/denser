import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * hb-auth stood in by clients sharing one worker per worker URL, as a SharedWorker is shared: each
 * worker keeps the users unlocked in it, and the keys registered through it. As hb-auth's, a worker
 * starts beekeeper on its first call, once for every call that reaches it before that start finished.
 * A client connecting to a worker that does not run starts it (fakeHbAuthStarts lists those).
 */
const FAKE_HB_AUTH = `
const workers = new Map();
const starts = [];
globalThis.fakeHbAuthWorkers = workers;
globalThis.fakeHbAuthStarts = starts;
globalThis.connectFakeHbAuthWorker = (url) => {
  if (!workers.has(url)) {
    starts.push(url);
    workers.set(url, { unlocked: new Set(), keys: new Set(), beekeepers: 0, started: false });
  }
  return workers.get(url);
};
export const DEFAULT_INIT_TIMEOUT = 30000;
export class OnlineClient {
  constructor(options) { this.options = options; }
  get worker() {
    return globalThis.connectFakeHbAuthWorker(this.options.workerUrl);
  }
  async startBeekeeper() {
    const worker = this.worker;
    if (worker.started) return worker;
    worker.beekeepers += 1;
    await new Promise((resolve) => setImmediate(resolve));
    worker.started = true;
    return worker;
  }
  async initialize() { this.worker; return this; }
  async getRegisteredUsers() { await this.startBeekeeper(); return []; }
  async getRegisteredUserByUsername() { await this.startBeekeeper(); return null; }
  async register(username, password, wif, keyType) {
    const worker = await this.startBeekeeper();
    await globalThis.fakeHbAuthRegistration;
    worker.unlocked.add(username);
    worker.keys.add(username + ':' + keyType);
    return { ok: true };
  }
  async sign(username, digest, keyType) {
    const worker = await this.startBeekeeper();
    if (!worker.keys.has(username + ':' + keyType)) throw new Error('missing authority');
    return 'signed in ' + this.options.workerUrl;
  }
  async authenticate(username) { (await this.startBeekeeper()).unlocked.add(username); return { ok: true }; }
  async importKey() { await this.startBeekeeper(); return 'STM-public-key'; }
  async invalidateExistingKey() { await this.startBeekeeper(); }
  async logout(username) { (await this.startBeekeeper()).unlocked.delete(username); }
  async lock() {
    const worker = await this.startBeekeeper();
    if (!worker.unlocked.size) throw new Error('There is no existing user session');
    worker.unlocked.clear();
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
  './safe-storage-generation': new URL('./safe-storage-generation.ts', import.meta.url).href,
  './worker-release': new URL('./worker-release.ts', import.meta.url).href
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
  keys: Set<string>;
  beekeepers: number;
  retiring?: boolean;
}

/** The stand-in hb-auth's workers, by URL, the URLs of those it started, and its connection to one */
const fakeHbAuth = globalThis as typeof globalThis & {
  fakeHbAuthWorkers: Map<string, FakeWorker>;
  fakeHbAuthStarts: string[];
  connectFakeHbAuthWorker: (url: string) => FakeWorker;
};

/**
 * A connection to the fake hb-auth worker at `url`, speaking public/auth/releasable-worker.js's
 * protocol: on the retire message the worker waits for the exclusive lock named after it, then ends.
 */
class FakeSharedWorker {
  readonly port: { postMessage: (message: unknown) => void };

  constructor(url: string) {
    const worker = fakeHbAuth.connectFakeHbAuthWorker(url);
    this.port = {
      postMessage: (message) => {
        if (typeof message !== 'object' || message === null || !('type' in message)) return;
        if (message.type !== 'denser:retire-worker' || worker.retiring) return;
        worker.retiring = true;
        navigator.locks.request(`denser:hb-auth-worker:${url}`, { mode: 'exclusive' }, () => {
          fakeHbAuth.fakeHbAuthWorkers.delete(url);
        });
      }
    };
  }
}

const GENERATION_KEY = 'hbauth-safe-storage-generation';

/** localStorage, counting the safe storage generation's writes */
class CountingStorage extends MemoryStorage {
  generationWrites = 0;
  override setItem(key: string, value: string) {
    if (key === GENERATION_KEY) this.generationWrites += 1;
    super.setItem(key, value);
  }
}

const storage = new CountingStorage();
const fakeEnv: Record<string, string> = {};
Object.assign(globalThis, {
  window: Object.assign(new EventTarget(), {
    localStorage: storage,
    location: { origin: 'https://hive.blog', href: 'https://hive.blog/blog/trending' }
  }),
  SharedWorker: FakeSharedWorker,
  fakeEnv
});

/** Holds every registration in the stand-in hb-auth, as its on-chain verification does, until released */
function holdRegistrations(): () => void {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  Object.assign(globalThis, { fakeHbAuthRegistration: held });
  return () => {
    Object.assign(globalThis, { fakeHbAuthRegistration: undefined });
    release();
  };
}

const BLOG = '/blog';
const WALLET = '/wallet';

type HbAuthService = typeof import('./hbauth-service.ts');
type OnlineClient = Awaited<ReturnType<HbAuthService['getOnlineClient']>>;
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
      onPage(async () => (await service.getOnlineClient()).importKey(username, 'wif', 'active')),
    getRegisteredUsers: () => onPage(async () => (await service.getOnlineClient()).getRegisteredUsers()),
    readUser: (username: string) =>
      onPage(async () => (await service.getOnlineClient()).getRegisteredUserByUsername(username)),
    registerThrough: (client: OnlineClient, username: string) =>
      onPage(() => client.register(username, 'password', 'wif', 'posting')),
    /** Runs `action` as code of this page */
    act: onPage,
    withOnlineClient: <T>(operation: (client: OnlineClient) => Promise<T>) =>
      onPage(() => service.withOnlineClient(operation)),
    logout: (username: string) => onPage(() => service.logoutFromEveryWorker(username))
  };
}

/** The worker URL a client of the stand-in hb-auth was created with, and its worker */
function workerOf(client: unknown): { url: string; worker: FakeWorker } {
  const { options, worker } = client as { options: { workerUrl: string }; worker: FakeWorker };
  return { url: options.workerUrl, worker };
}

/** Lets the replaced client's lock, and its worker's release, which are not awaited, settle */
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('hb-auth online client', () => {
  beforeEach(() => {
    storage.clear();
    storage.generationWrites = 0;
  });

  it('starts no generation when there is none, so apps loading together keep their workers', async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);

    const blogClient = await blog.getOnlineClient();
    const walletClient = await wallet.getOnlineClient();

    assert.equal(workerOf(blogClient).url, 'https://hive.blog/blog/auth/releasable-worker.js');
    assert.equal(workerOf(walletClient).url, 'https://hive.blog/wallet/auth/releasable-worker.js');
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
    assert.match(fresh.url, /^https:\/\/hive\.blog\/blog\/auth\/releasable-worker\.js\?storage=/);
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

  it("writes through the app's current client when the writing one's worker was superseded", async () => {
    const blog = await openPage(BLOG);
    const staleClient = await blog.getOnlineClient();
    const wallet = await openPage(WALLET);
    await wallet.importKey('alice');

    await blog.registerThrough(staleClient, 'alice');
    const currentClient = await blog.getOnlineClient();
    await settle();

    assert.notEqual(currentClient, staleClient);
    assert.deepEqual([...workerOf(currentClient).worker.unlocked], ['alice']);
    assert.deepEqual([...workerOf(staleClient).worker.unlocked], []);
    const otherBlogTab = await openPage(BLOG);
    assert.equal(workerOf(await otherBlogTab.getOnlineClient()).url, workerOf(currentClient).url);
  });

  it("keeps the app on its current worker, unlocked, when a write superseded during it lands", async () => {
    const blogTabA = await openPage(BLOG);
    const staleClient = await blogTabA.getOnlineClient();
    const releaseRegistrations = holdRegistrations();
    const staleWrite = blogTabA.register('alice');
    await settle();

    const wallet = await openPage(WALLET);
    await wallet.importKey('alice');
    const blogTabB = await openPage(BLOG);
    const currentClient = await blogTabB.getOnlineClient();
    const currentWorker = workerOf(currentClient);
    currentWorker.worker.unlocked.add('alice');
    releaseRegistrations();
    await staleWrite;
    await settle();

    assert.notEqual(currentWorker.url, workerOf(staleClient).url);
    assert.equal(await blogTabB.getOnlineClient(), currentClient);
    assert.deepEqual([...currentWorker.worker.unlocked], ['alice']);
    const otherBlogTab = await openPage(BLOG);
    assert.equal(workerOf(await otherBlogTab.getOnlineClient()).url, currentWorker.url);
  });

  it("logs out of every worker the app's pages were given, not only the current one", async () => {
    const wallet = await openPage(WALLET);
    await wallet.importKey('alice');
    const idleBlogTab = await openPage(BLOG);
    await idleBlogTab.register('alice');
    const idleWorker = workerOf(await idleBlogTab.getOnlineClient());
    await wallet.importKey('alice');
    const blog = await openPage(BLOG);
    await blog.register('alice');
    const currentWorker = workerOf(await blog.getOnlineClient());
    assert.notEqual(currentWorker.url, idleWorker.url);
    assert.deepEqual([...idleWorker.worker.unlocked], ['alice']);

    await blog.logout('alice');

    assert.deepEqual([...idleWorker.worker.unlocked], []);
    assert.deepEqual([...currentWorker.worker.unlocked], []);
  });

  it("starts one beekeeper in each worker the page moves to, however many calls reach it at once", async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);
    const workers: FakeWorker[] = [];

    for (let change = 0; change < 5; change++) {
      await wallet.importKey('alice');
      await Promise.all(Array.from({ length: 5 }, () => blog.readUser('alice')));
      workers.push(workerOf(await blog.getOnlineClient()).worker);
    }

    assert.equal(new Set(workers).size, 5);
    assert.deepEqual(
      workers.map((worker) => worker.beekeepers),
      [1, 1, 1, 1, 1]
    );
  });

  it('locks a replaced worker only once the operations running with it settle', async () => {
    const blog = await openPage(BLOG);
    await blog.register('alice');
    const signingWorker = workerOf(await blog.getOnlineClient());
    let finishSigning = () => {};
    const signing = blog.withOnlineClient(
      () =>
        new Promise<void>((resolve) => {
          finishSigning = resolve;
        })
    );
    const wallet = await openPage(WALLET);
    await wallet.importKey('alice');

    const freshClient = await blog.getOnlineClient();
    await settle();

    assert.notEqual(workerOf(freshClient).url, signingWorker.url);
    assert.deepEqual([...signingWorker.worker.unlocked], ['alice']);
    finishSigning();
    await signing;
    await settle();
    assert.deepEqual([...signingWorker.worker.unlocked], []);
  });

  it('logs out of no worker that stopped running, and starts none to log out of it', async () => {
    const wallet = await openPage(WALLET);
    await wallet.importKey('alice');
    const blog = await openPage(BLOG);
    await blog.register('alice');
    const retiredUrl = workerOf(await blog.getOnlineClient()).url;
    await wallet.importKey('alice');
    await blog.register('alice');
    await settle();
    assert.equal(fakeHbAuth.fakeHbAuthWorkers.has(retiredUrl), false);
    const startsBefore = fakeHbAuth.fakeHbAuthStarts.length;

    await blog.logout('alice');
    await settle();

    assert.deepEqual(fakeHbAuth.fakeHbAuthStarts.slice(startsBefore), []);
    assert.equal(fakeHbAuth.fakeHbAuthWorkers.has(retiredUrl), false);
  });

  it('renews the safe storage generation once for all the writes of one operation', async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);
    const walletClient = await wallet.getOnlineClient();

    await blog.withOnlineClient(async (client) => {
      for (const keyType of ['posting', 'active', 'owner'] as const)
        await client.register('alice', 'password', 'wif', keyType);
      assert.equal(storage.generationWrites, 0);
    });

    assert.equal(storage.generationWrites, 1);
    const replacedOnce = await wallet.getOnlineClient();
    assert.notEqual(replacedOnce, walletClient);
    assert.equal(await wallet.getOnlineClient(), replacedOnce);
  });

  it('signs with the worker a key was registered in, when another app replaced the worker during the operation', async () => {
    const blog = await openPage(BLOG);
    await blog.register('carol');
    const startedOn = workerOf(await blog.getOnlineClient()).url;
    const wallet = await openPage(WALLET);

    const signature = await blog.withOnlineClient(async (client) => {
      await wallet.importKey('carol');
      return blog.act(async () => {
        await client.register('carol', 'password', 'wif', 'active');
        return client.sign('carol', 'digest', 'active');
      });
    });

    const currentUrl = workerOf(await blog.getOnlineClient()).url;
    assert.notEqual(currentUrl, startedOn);
    assert.equal(signature, `signed in ${currentUrl}`);
  });

  it("starts one beekeeper in the worker every tab of the app moves to at once", async () => {
    const tabs = await Promise.all([openPage(BLOG), openPage(BLOG), openPage(BLOG)]);
    await Promise.all(tabs.map((tab) => tab.getOnlineClient()));
    const wallet = await openPage(WALLET);

    await wallet.importKey('alice');
    await Promise.all(tabs.map((tab) => tab.getRegisteredUsers()));

    const workers = await Promise.all(tabs.map(async (tab) => workerOf(await tab.getOnlineClient()).worker));
    assert.equal(new Set(workers).size, 1);
    assert.equal(workers[0].beekeepers, 1);
  });
});
