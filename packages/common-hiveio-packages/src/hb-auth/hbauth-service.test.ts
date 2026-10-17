import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

/**
 * hb-auth 1.28.4 stood in by clients sharing one worker per worker URL, as a SharedWorker is shared:
 * each worker keeps the users unlocked in it, and the keys of the wallet files (fakeHbAuthFiles) it
 * read when it started; a key write changes its keys and writes them all back to the files. Key
 * aliases (fakeHbAuthAliases) live in an IndexedDB store every worker reads and writes per record:
 * register and importKey refuse a key type an alias exists for, invalidateExistingKey removes it.
 * importKey and sign need the user unlocked in the worker, which register and authenticate do with
 * the user's password (fakeHbAuthPasswords), starting the user's session in it; unlock needs that
 * session. As hb-auth's, a worker starts beekeeper on its first call, once for every call that
 * reaches it before that start finished. A client connecting to a worker that does not run starts it
 * (fakeHbAuthStarts lists those). fakeHbAuthWrite, when set, is awaited by every key write before it
 * lands, as hb-auth's on-chain verification is; register's fails, as on an API node that does not
 * show the key yet, while fakeHbAuthChainLags is set when it starts. User settings lack `strict`.
 */
const FAKE_HB_AUTH = `
const workers = new Map();
const starts = [];
globalThis.fakeHbAuthFiles = new Set();
globalThis.fakeHbAuthAliases = new Set();
globalThis.fakeHbAuthPasswords = new Map();
globalThis.fakeHbAuthWorkers = workers;
globalThis.fakeHbAuthStarts = starts;
globalThis.connectFakeHbAuthWorker = (url) => {
  if (!workers.has(url)) {
    starts.push(url);
    workers.set(url, { unlocked: new Set(), authorized: new Set(), keys: new Set(globalThis.fakeHbAuthFiles), beekeepers: 0, started: false });
  }
  return workers.get(url);
};
const alias = (username, keyType) => username + '@' + keyType;
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
  async writeKey(worker, username, keyType, checkOnChain = false) {
    const lagging = checkOnChain && globalThis.fakeHbAuthChainLags;
    await globalThis.fakeHbAuthWrite?.();
    if (lagging) throw new Error('Invalid credentials');
    if (globalThis.fakeHbAuthAliases.has(alias(username, keyType)))
      throw new Error("This user is already registered with '" + keyType + "' authority");
    worker.keys.add(username + ':' + keyType);
    globalThis.fakeHbAuthFiles = new Set(worker.keys);
    globalThis.fakeHbAuthAliases.add(alias(username, keyType));
  }
  async initialize() { this.worker; return this; }
  async getRegisteredUsers() { await this.startBeekeeper(); return []; }
  async getRegisteredUserByUsername(username) {
    const worker = await this.startBeekeeper();
    const registeredKeyTypes = [...globalThis.fakeHbAuthAliases]
      .filter((key) => key.startsWith(username + '@'))
      .map((key) => key.slice(username.length + 1));
    if (!registeredKeyTypes.length) return null;
    return { username, unlocked: worker.unlocked.has(username), authorized: worker.authorized.has(username), registeredKeyTypes };
  }
  async getUserSettings(username) { await this.startBeekeeper(); return { alias: username, authorizedAccounts: {} }; }
  async setUserSettings() { await this.startBeekeeper(); }
  async register(username, password, wif, keyType) {
    const worker = await this.startBeekeeper();
    const known = globalThis.fakeHbAuthPasswords.get(username);
    if (known !== undefined && known !== password) throw new Error('Invalid credentials');
    globalThis.fakeHbAuthPasswords.set(username, password);
    await this.writeKey(worker, username, keyType, true);
    worker.unlocked.add(username);
    worker.authorized.add(username);
    return { ok: true };
  }
  async sign(username, digest, keyType) {
    const worker = await this.startBeekeeper();
    if (!worker.unlocked.has(username)) throw new Error('Not authorized');
    if (!worker.keys.has(username + ':' + keyType) || !globalThis.fakeHbAuthAliases.has(alias(username, keyType)))
      throw new Error('Not authorized, missing authority');
    return 'signed in ' + this.options.workerUrl;
  }
  async authenticate(username, password, keyType) {
    const worker = await this.startBeekeeper();
    if (globalThis.fakeHbAuthPasswords.get(username) !== password) throw new Error('Invalid credentials');
    if (!worker.keys.has(username + ':' + keyType)) throw new Error('Not authorized, missing authority');
    worker.unlocked.add(username);
    worker.authorized.add(username);
    return { ok: true };
  }
  async unlock(username, password) {
    const worker = await this.startBeekeeper();
    if (!worker.authorized.has(username)) throw new Error('There is no existing user session or session already expired');
    if (globalThis.fakeHbAuthPasswords.get(username) !== password) throw new Error('Invalid credentials');
    worker.unlocked.add(username);
  }
  async importKey(username, wif, keyType) {
    const worker = await this.startBeekeeper();
    if (!worker.unlocked.has(username)) throw new Error('User is not logged in. Please login for importing key');
    await this.writeKey(worker, username, keyType);
    return 'STM-public-key';
  }
  async invalidateExistingKey(username, keyType) {
    await this.startBeekeeper();
    globalThis.fakeHbAuthAliases.delete(alias(username, keyType));
  }
  async logout(username) {
    const worker = await this.startBeekeeper();
    worker.unlocked.delete(username);
    worker.authorized.delete(username);
  }
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
  '../wax': "export const getChain = async () => ({ calculatePublicKey: () => 'STM-public-key' });"
};
const MODULES: Record<string, string> = {
  '@hive/ui/lib/storage-with-ttl': new URL('../../../ui/lib/storage-with-ttl.ts', import.meta.url).href,
  './safe-storage-generation': new URL('./safe-storage-generation.ts', import.meta.url).href,
  './worker-release': new URL('./worker-release.ts', import.meta.url).href,
  './online-client-operation': new URL('./online-client-operation.ts', import.meta.url).href
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
  authorized: Set<string>;
  keys: Set<string>;
  beekeepers: number;
  retiring?: boolean;
}

/**
 * The stand-in hb-auth's wallet files, key aliases, users' passwords, its workers, by URL, the URLs
 * of those it started, and its connection to one
 */
const fakeHbAuth = globalThis as typeof globalThis & {
  fakeHbAuthFiles: Set<string>;
  fakeHbAuthAliases: Set<string>;
  fakeHbAuthPasswords: Map<string, string>;
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

/** Holds the next key write in the stand-in hb-auth, as its on-chain verification does, until released */
function holdNextWrite(): () => void {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  setBeforeEveryWrite(() => {
    setBeforeEveryWrite(undefined);
    return held;
  });
  return release;
}

/** Has the stand-in hb-auth await `beforeWrite` before every key write lands */
function setBeforeEveryWrite(beforeWrite: (() => Promise<void>) | undefined): void {
  Object.assign(globalThis, { fakeHbAuthWrite: beforeWrite });
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
    /** Adds the user's posting key to safe storage, again when it has it */
    register: (username: string) =>
      onPage(() =>
        service.withOnlineClient(async (client) => {
          await client.invalidateExistingKey(username, 'posting');
          return client.register(username, 'password', 'wif', 'posting');
        })
      ),
    /** Adds the active key of the user, logged in to the page's worker, to safe storage, again when it has it */
    importKey: (username: string) =>
      onPage(() =>
        service.withOnlineClient(async (client) => {
          workerOf(client).worker.unlocked.add(username);
          await client.invalidateExistingKey(username, 'active');
          return client.importKey(username, 'wif', 'active');
        })
      ),
    getRegisteredUsers: () => onPage(async () => (await service.getOnlineClient()).getRegisteredUsers()),
    readUser: (username: string) =>
      onPage(async () => (await service.getOnlineClient()).getRegisteredUserByUsername(username)),
    registerThrough: (client: OnlineClient, username: string) =>
      onPage(() => client.register(username, 'password', 'wif', 'posting')),
    /** Runs `action` as code of this page */
    act: onPage,
    withOnlineClient: <T>(
      operation: (client: OnlineClient) => Promise<T>,
      options?: Parameters<HbAuthService['withOnlineClient']>[1]
    ) => onPage(() => service.withOnlineClient(operation, options)),
    SupersededKeyWriteError: service.SupersededKeyWriteError,
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
    fakeHbAuth.fakeHbAuthFiles = new Set();
    fakeHbAuth.fakeHbAuthAliases = new Set();
    fakeHbAuth.fakeHbAuthPasswords = new Map();
    setBeforeEveryWrite(undefined);
    Object.assign(globalThis, { fakeHbAuthChainLags: false });
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
    const releaseWrite = holdNextWrite();
    const staleWrite = blogTabA.register('alice');
    await settle();

    const wallet = await openPage(WALLET);
    await wallet.importKey('alice');
    const blogTabB = await openPage(BLOG);
    const currentClient = await blogTabB.getOnlineClient();
    const currentWorker = workerOf(currentClient);
    currentWorker.worker.unlocked.add('alice');
    releaseWrite();
    await staleWrite;
    await settle();

    assert.notEqual(currentWorker.url, workerOf(staleClient).url);
    assert.equal(await blogTabB.getOnlineClient(), currentClient);
    assert.deepEqual([...currentWorker.worker.unlocked], ['alice']);
    assert.equal(currentWorker.worker.keys.has('alice:posting'), true);
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

  it('renews the safe storage generation after every write of one operation, keeping the writer on its worker', async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);
    const walletClient = await wallet.getOnlineClient();
    const blogClient = await blog.getOnlineClient();

    await blog.withOnlineClient(async (client) => {
      for (const keyType of ['posting', 'active', 'owner'] as const)
        await client.register('alice', 'password', 'wif', keyType);
      assert.equal(storage.generationWrites, 3);
    });

    assert.equal(storage.generationWrites, 3);
    assert.equal(await blog.getOnlineClient(), blogClient);
    const replaced = await wallet.getOnlineClient();
    assert.notEqual(replaced, walletClient);
    assert.equal(await wallet.getOnlineClient(), replaced);
  });

  it("keeps an operation's later key when another app starts a worker while the operation waits between writes", async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);

    await blog.withOnlineClient(async (client) => {
      await blog.act(() => client.register('frank', 'password', 'wif', 'posting'));
      // The shared key types' lookup on the network, during which the wallet loads
      await wallet.getOnlineClient();
      await blog.act(() => client.register('frank', 'password', 'wif', 'owner'));
    });
    await wallet.importKey('frank');

    assert.deepEqual(
      ['frank:posting', 'frank:owner', 'frank:active'].filter((key) => fakeHbAuth.fakeHbAuthFiles.has(key)),
      ['frank:posting', 'frank:owner', 'frank:active']
    );
  });

  it("repeats an operation's write in the app's current worker when another app's write superseded it meanwhile", async () => {
    const blog = await openPage(BLOG);
    const startedOn = workerOf(await blog.getOnlineClient()).url;
    const wallet = await openPage(WALLET);
    const releaseWrite = holdNextWrite();

    const signature = await blog.withOnlineClient(async (client) => {
      const write = blog.act(() => client.register('grace', 'password', 'wif', 'posting'));
      await settle();
      await wallet.importKey('grace');
      await blog.act(() => {
        releaseWrite();
        return write;
      });
      return blog.act(() => client.sign('grace', 'digest', 'posting'));
    });

    const current = workerOf(await blog.getOnlineClient());
    assert.notEqual(current.url, startedOn);
    assert.equal(signature, `signed in ${current.url}`);
    assert.equal(current.worker.keys.has('grace:posting'), true);
    assert.equal(fakeHbAuth.fakeHbAuthFiles.has('grace:posting'), true);
  });

  it('signs with the worker a key was registered in, when another app replaced the worker during the operation', async () => {
    const blog = await openPage(BLOG);
    await blog.register('carol');
    const startedOn = workerOf(await blog.getOnlineClient()).url;
    const wallet = await openPage(WALLET);

    const signature = await blog.withOnlineClient(async (client) => {
      await wallet.importKey('carol');
      return blog.act(async () => {
        await client.register('carol', 'password', 'wif', 'owner');
        return client.sign('carol', 'digest', 'owner');
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

  it("keeps a key registered in an operation when another app writes before the operation settles", async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);
    await wallet.getOnlineClient();

    await blog.withOnlineClient(async (client) => {
      await blog.act(() => client.register('bob', 'password', 'wif', 'posting'));
      await wallet.importKey('bob');
      return blog.act(() => client.getRegisteredUsers());
    });

    const { worker } = workerOf(await blog.getOnlineClient());
    assert.deepEqual(
      ['bob:posting', 'bob:active'].filter((key) => worker.keys.has(key)),
      ['bob:posting', 'bob:active']
    );
  });

  it('renews the safe storage generation right after a write made outside an operation, while one is pending', async () => {
    const blog = await openPage(BLOG);
    const wallet = await openPage(WALLET);
    const walletClient = await wallet.getOnlineClient();
    let finishSigning = () => {};
    const signing = blog.withOnlineClient(
      () =>
        new Promise<void>((resolve) => {
          finishSigning = resolve;
        })
    );

    await blog.registerThrough(await blog.getOnlineClient(), 'dave');

    assert.equal(storage.generationWrites, 1);
    assert.notEqual(await wallet.getOnlineClient(), walletClient);
    finishSigning();
    await signing;
    assert.equal(storage.generationWrites, 1);
  });

  it('starts no stopped worker when two pages log out of it at once', async () => {
    const wallet = await openPage(WALLET);
    await wallet.importKey('erin');
    const tabs = [await openPage(BLOG), await openPage(BLOG)];
    await Promise.all(tabs.map((tab) => tab.getOnlineClient()));
    // A tab of the app on an older worker, which closes, ending it, once the tabs logging out listed it
    const idleUrl = 'https://hive.blog/blog/auth/releasable-worker.js?storage=idle';
    fakeHbAuth.connectFakeHbAuthWorker(idleUrl);
    let closeIdleTab = () => {};
    void navigator.locks.request(
      `denser:hb-auth-worker:${idleUrl}`,
      { mode: 'shared' },
      () => new Promise<void>((resolve) => (closeIdleTab = resolve))
    );
    const query = navigator.locks.query.bind(navigator.locks);
    const startsBefore = fakeHbAuth.fakeHbAuthStarts.length;
    Object.assign(navigator.locks, {
      query: async () => {
        const snapshot = await query();
        closeIdleTab();
        fakeHbAuth.fakeHbAuthWorkers.delete(idleUrl);
        return snapshot;
      }
    });

    try {
      await Promise.all(tabs.map((tab) => tab.logout('erin')));
    } finally {
      Reflect.deleteProperty(navigator.locks, 'query');
    }
    await settle();

    assert.deepEqual(fakeHbAuth.fakeHbAuthStarts.slice(startsBefore), []);
  });

  /**
   * Runs `write` on `page` while `otherApp` adds a key to safe storage, so `write` lands in a worker
   * another app's write superseded meanwhile
   */
  async function writeSupersededBy<T>(
    page: Awaited<ReturnType<typeof openPage>>,
    otherApp: Awaited<ReturnType<typeof openPage>>,
    username: string,
    write: () => Promise<T>
  ): Promise<T> {
    const releaseWrite = holdNextWrite();
    const landing = page.act(write);
    await settle();
    await otherApp.importKey(username);
    releaseWrite();
    return landing;
  }

  it("repeats a superseded key import in the current worker, unlocked with the operation's password", async () => {
    const blog = await openPage(BLOG);
    await blog.register('heidi');
    const startedOn = workerOf(await blog.getOnlineClient()).url;
    const wallet = await openPage(WALLET);
    let prompts = 0;
    const requestPassword = async () => {
      prompts += 1;
      return 'password';
    };

    const signature = await blog.withOnlineClient(async (client) => {
      await blog.act(() => client.authenticate('heidi', 'password', 'posting'));
      await writeSupersededBy(blog, wallet, 'heidi', () => client.importKey('heidi', 'wif', 'owner'));
      return blog.act(() => client.sign('heidi', 'digest', 'owner'));
    }, { requestPassword });

    const current = workerOf(await blog.getOnlineClient());
    assert.notEqual(current.url, startedOn);
    assert.equal(signature, `signed in ${current.url}`);
    assert.equal(prompts, 0);
    assert.equal(fakeHbAuth.fakeHbAuthFiles.has('heidi:owner'), true);
  });

  it('asks for the password once to repeat a superseded key import when the operation did not unlock', async () => {
    const blog = await openPage(BLOG);
    await blog.register('ivan');
    const wallet = await openPage(WALLET);
    const asked: string[] = [];
    const requestPassword = async (username: string) => {
      asked.push(username);
      return 'password';
    };

    await blog.withOnlineClient(async (client) => {
      await writeSupersededBy(blog, wallet, 'ivan', () => client.importKey('ivan', 'wif', 'owner'));
      await writeSupersededBy(blog, wallet, 'ivan', () => client.importKey('ivan', 'wif', 'memo'));
    }, { requestPassword });

    assert.deepEqual(asked, ['ivan']);
    const { worker } = workerOf(await blog.getOnlineClient());
    assert.deepEqual(
      ['ivan:owner', 'ivan:memo'].filter((key) => worker.keys.has(key)),
      ['ivan:owner', 'ivan:memo']
    );
  });

  it('rejects a superseded key import it cannot unlock for with a message to add the key again', async () => {
    const blog = await openPage(BLOG);
    await blog.register('judy');
    const wallet = await openPage(WALLET);

    const importing = blog.withOnlineClient((client) =>
      writeSupersededBy(blog, wallet, 'judy', () => client.importKey('judy', 'wif', 'owner'))
    );

    await assert.rejects(importing, (error: unknown) => {
      assert.ok(error instanceof blog.SupersededKeyWriteError);
      assert.equal(error.username, 'judy');
      assert.equal(error.keyType, 'owner');
      assert.doesNotMatch(error.message, /already registered/);
      return true;
    });
  });

  it('keeps the alias of a superseded key import when the password the user enters to repeat it is wrong', async () => {
    const blog = await openPage(BLOG);
    await blog.register('nina');
    const wallet = await openPage(WALLET);
    const requestPassword = async () => 'wrong password';

    const importing = blog.withOnlineClient(
      (client) => writeSupersededBy(blog, wallet, 'nina', () => client.importKey('nina', 'wif', 'owner')),
      { requestPassword }
    );

    await assert.rejects(importing, (error: unknown) => error instanceof blog.SupersededKeyWriteError);
    assert.equal(fakeHbAuth.fakeHbAuthAliases.has('nina@owner'), true);
  });

  it('repeats a superseded register without checking the key on chain again, keeping its alias', async () => {
    const blog = await openPage(BLOG);
    await blog.register('olga');
    const wallet = await openPage(WALLET);
    let superseded = false;
    setBeforeEveryWrite(async () => {
      if (superseded) return;
      superseded = true;
      await wallet.importKey('olga');
      // The API node the repeat asks does not show the newly registered key yet
      Object.assign(globalThis, { fakeHbAuthChainLags: true });
    });

    const signature = await blog.withOnlineClient(async (client) => {
      await blog.act(() => client.register('olga', 'password', 'wif', 'owner'));
      return blog.act(() => client.sign('olga', 'digest', 'owner'));
    });

    const current = workerOf(await blog.getOnlineClient());
    assert.equal(signature, `signed in ${current.url}`);
    assert.equal(fakeHbAuth.fakeHbAuthAliases.has('olga@owner'), true);
    assert.equal(fakeHbAuth.fakeHbAuthFiles.has('olga:owner'), true);
  });

  it('gives up on a write another app keeps superseding after three repeats', async () => {
    const blog = await openPage(BLOG);
    await blog.getOnlineClient();
    const wallet = await openPage(WALLET);
    let attempts = 0;
    let superseding = false;
    setBeforeEveryWrite(async () => {
      if (superseding) return;
      superseding = true;
      attempts += 1;
      await wallet.importKey('ken');
      superseding = false;
    });

    const registering = blog.withOnlineClient((client) =>
      blog.act(() => client.register('ken', 'password', 'wif', 'posting'))
    );

    await assert.rejects(registering, (error: unknown) => error instanceof blog.SupersededKeyWriteError);
    assert.equal(attempts, 4);
  });

  it("starts one worker for another app's operation however many times its writes renew the generation", async () => {
    const blog = await openPage(BLOG);
    await blog.getOnlineClient();
    const wallet = await openPage(WALLET);
    const startsBefore = fakeHbAuth.fakeHbAuthStarts.length;
    const asked: Promise<OnlineClient>[] = [];

    await wallet.withOnlineClient(async (client) => {
      workerOf(client).worker.unlocked.add('liam');
      for (const keyType of ['posting', 'active', 'owner', 'memo'] as const) {
        await wallet.act(() => client.invalidateExistingKey('liam', keyType));
        asked.push(blog.getOnlineClient());
        await wallet.act(() => client.importKey('liam', 'wif', keyType));
        asked.push(blog.getOnlineClient());
      }
    });
    const clients = await Promise.all(asked);

    assert.equal(storage.generationWrites, 8);
    const blogStarts = fakeHbAuth.fakeHbAuthStarts.slice(startsBefore).filter((url) => url.includes(BLOG));
    assert.equal(blogStarts.length, 1);
    assert.equal(new Set(clients).size, 1);
    assert.equal(workerOf(clients[0]).worker.keys.has('liam:memo'), true);
  });

  it("gives a fresh client while an operation waiting on the user holds a worker another app's writes replaced twice", async () => {
    const blog = await openPage(BLOG);
    await blog.register('mia');
    let closeDialog = () => {};
    const signing = blog.withOnlineClient(
      () =>
        new Promise<void>((resolve) => {
          closeDialog = resolve;
        })
    );
    const wallet = await openPage(WALLET);
    await wallet.importKey('mia');
    const replacement = await blog.getOnlineClient();

    await wallet.importKey('mia');
    const fresh = await blog.getOnlineClient();

    assert.notEqual(fresh, replacement);
    assert.equal(workerOf(fresh).worker.keys.has('mia:active'), true);
    closeDialog();
    await signing;
  });
});
