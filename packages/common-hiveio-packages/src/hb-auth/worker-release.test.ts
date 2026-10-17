import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The page side of worker release against Node's Web Locks, with SharedWorker stood in by the
 * protocol of public/auth/releasable-worker.js: on the retire message the worker waits for the
 * exclusive lock named after it, then ends.
 */
const ORIGIN = 'https://hive.blog';
const WORKER_URL = '/blog/auth/releasable-worker.js?storage=g1';
const ABSOLUTE_WORKER_URL = `${ORIGIN}${WORKER_URL}`;

let retireMessages: string[] = [];
let endedWorkers: string[] = [];
const retiringWorkers = new Set<string>();

class FakeSharedWorker {
  readonly port: { postMessage: (message: unknown) => void };

  constructor(url: string) {
    this.port = {
      postMessage: (message) => {
        if (typeof message !== 'object' || message === null || !('type' in message)) return;
        if (message.type !== 'denser:retire-worker') return;
        retireMessages.push(url);
        if (retiringWorkers.has(url)) return;
        retiringWorkers.add(url);
        navigator.locks.request(`denser:hb-auth-worker:${url}`, { mode: 'exclusive' }, () => {
          retiringWorkers.delete(url);
          endedWorkers.push(url);
        });
      }
    };
  }
}

Object.assign(globalThis, { window: { location: { href: `${ORIGIN}/blog/trending` } }, SharedWorker: FakeSharedWorker });

type WorkerRelease = typeof import('./worker-release.ts');
let pageCount = 0;

/** A page: a module instance of its own, as another tab has */
const openPage = (): Promise<WorkerRelease> => import(`./worker-release.ts?page=${++pageCount}`);

// worker-release.ts's bound on how long one start keeps the others of its worker waiting
const START_LOCK_TIMEOUT_MS = 10_000;

/** Lets lock grants and the worker's end settle */
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('hb-auth worker release', () => {
  beforeEach(() => {
    retireMessages = [];
    endedWorkers = [];
  });

  it('retires a worker once none of the clients of the page that held it use it, which ends it', async () => {
    const page = await openPage();
    const releaseFirst = await page.holdWorker(WORKER_URL);
    const releaseSecond = await page.holdWorker(WORKER_URL);
    assert.ok(releaseFirst && releaseSecond);

    releaseFirst();
    releaseFirst();
    await settle();
    assert.deepEqual(retireMessages, []);

    releaseSecond();
    await settle();
    assert.deepEqual(retireMessages, [ABSOLUTE_WORKER_URL]);
    assert.deepEqual(endedWorkers, [ABSOLUTE_WORKER_URL]);
  });

  it('keeps a retired worker running while another page holds it, and gives no hold of it meanwhile', async () => {
    const page = await openPage();
    const otherPage = await openPage();
    const release = await page.holdWorker(WORKER_URL);
    const otherRelease = await otherPage.holdWorker(WORKER_URL);
    assert.ok(release && otherRelease);

    release();
    await settle();
    assert.deepEqual(endedWorkers, []);
    assert.equal(await (await openPage()).holdWorker(WORKER_URL), null);

    otherRelease();
    await settle();
    assert.deepEqual(endedWorkers, [ABSOLUTE_WORKER_URL]);
  });

  it('holds the worker a page starts after the one at its URL ended', async () => {
    const page = await openPage();
    (await page.holdWorker(WORKER_URL))?.();
    await settle();

    const release = await page.holdWorker(WORKER_URL);
    assert.ok(release);
    release();
    await settle();

    assert.deepEqual(endedWorkers, [ABSOLUTE_WORKER_URL, ABSOLUTE_WORKER_URL]);
  });

  it('holds a running worker only while another page holds it, without connecting to one that is not running', async () => {
    const page = await openPage();
    const otherPage = await openPage();
    assert.equal(await page.holdRunningWorker(WORKER_URL), null);
    await settle();
    assert.deepEqual(retireMessages, []);

    const otherRelease = await otherPage.holdWorker(WORKER_URL);
    assert.deepEqual(await page.otherRunningWorkers('/blog/auth/releasable-worker.js'), [ABSOLUTE_WORKER_URL]);
    const release = await page.holdRunningWorker(WORKER_URL);
    assert.ok(release && otherRelease);
    release();
    otherRelease();
    await settle();

    assert.deepEqual(endedWorkers, [ABSOLUTE_WORKER_URL]);
    assert.deepEqual(await page.otherRunningWorkers('/blog/auth/releasable-worker.js'), []);
  });

  it('lets the next start of a worker run once a start that does not settle held it long enough', async () => {
    const page = await openPage();
    const otherPage = await openPage();
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const wedged = page.startWithWorker(WORKER_URL, () => new Promise<never>(() => {}));
      let started = false;
      const next = otherPage.startWithWorker(WORKER_URL, async () => {
        started = true;
        return 'started';
      });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(started, false);

      mock.timers.tick(START_LOCK_TIMEOUT_MS);

      assert.equal(await next, 'started');
      void wedged;
    } finally {
      mock.timers.reset();
    }
  });
});
