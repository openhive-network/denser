import type { Browser, BrowserContext, Page } from '@playwright/test';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { gotoPostLoggedIn } from '../support/reblogShareContext';

/**
 * A safe-storage session's page replaces its hb-auth client each time another app's write changes
 * the safe storage generation: the new client's SharedWorker reads the wallet files anew. Each worker
 * instantiates beekeeper's WASM, and a SharedWorker runs while any page that connected to it is open,
 * so the page lets go of the worker it replaced, which then ends (public/auth/releasable-worker.js).
 *
 * Live workers are read off the browser's targets (CDP); the WASM instances in each, and the clients
 * connected to it, from a counter the spec adds to the worker script. The tabs of one app move to a
 * new worker together, and the first client to start one starts it alone, so it instantiates one. Another app's write is played by writing the generation record
 * the way it does, from a same-origin page that runs no app code (the storage event reaches only the
 * other pages).
 *
 * Fixtures: reuses `reblogShare` (read-only on replay).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- hbAuthWorkerRelease
 */

test.skip(isRecordMode, 'replay-only: shares the reblogShare recording');
test.use({
  fixtureTestName: 'reblogShare',
  authenticatedUser: { loginType: LoginType.hbauth, keyType: KeyType.posting }
});

const WORKER_SCRIPT = /\/auth\/releasable-worker\.js(\?|$)/;
const GENERATION_CHANGES = 5;
const TABS = 3;
const COUNT_WASM_MESSAGE = 'spec:count-wasm';

// Appended to the worker module: its imports run first, and beekeeper instantiates its WASM later,
// when a client starts its session. The spec's own connections, which ask for the counts, are not
// counted as clients.
const WASM_COUNTER = `
let specWasmInstances = 0;
let specConnections = 0;
let specProbes = 0;
for (const name of ['instantiate', 'instantiateStreaming']) {
  const instantiate = WebAssembly[name];
  WebAssembly[name] = (...args) => instantiate.apply(WebAssembly, args).then((result) => {
    specWasmInstances += 1;
    return result;
  });
}
self.addEventListener('connect', (event) => {
  specConnections += 1;
  const port = event.ports[0];
  port.addEventListener('message', ({ data }) => {
    if (data?.type !== '${COUNT_WASM_MESSAGE}') return;
    specProbes += 1;
    port.postMessage({ wasmInstances: specWasmInstances, clients: specConnections - specProbes });
  });
  port.start();
});
`;

/** Counts the worker scripts the context's pages load, one per client of a new worker */
async function countWorkerLoads(context: BrowserContext): Promise<string[]> {
  const loads: string[] = [];
  await context.route(WORKER_SCRIPT, async (route) => {
    loads.push(route.request().url());
    const response = await route.fetch();
    const { 'content-encoding': _encoding, 'content-length': _length, ...headers } = response.headers();
    await route.fulfill({ response, headers, body: `${await response.text()}\n${WASM_COUNTER}` });
  });
  return loads;
}

/** The URLs of the hb-auth SharedWorkers running in the browser */
async function watchLiveWorkers(browser: Browser): Promise<() => string[]> {
  const cdp = await browser.newBrowserCDPSession();
  const workers = new Map<string, string>();
  cdp.on('Target.targetCreated', ({ targetInfo }) => {
    if (targetInfo.type === 'shared_worker' && WORKER_SCRIPT.test(targetInfo.url))
      workers.set(targetInfo.targetId, targetInfo.url);
  });
  cdp.on('Target.targetDestroyed', ({ targetId }) => workers.delete(targetId));
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  return () => [...workers.values()];
}

interface WorkerCounts {
  wasmInstances: number;
  clients: number;
}

/** The WASM instances the running worker at `workerUrl` created, and the clients connected to it */
function countWorker(page: Page, workerUrl: string): Promise<WorkerCounts> {
  return page.evaluate(
    ([url, type]) =>
      new Promise<WorkerCounts>((resolve) => {
        // As hb-auth connects: a connection with other options fails
        const options: WorkerOptions & { extendedLifetime: boolean } = { type: 'module', extendedLifetime: true };
        const port = new SharedWorker(url, options).port;
        port.onmessage = ({ data }) => resolve(data);
        port.postMessage({ type });
      }),
    [workerUrl, COUNT_WASM_MESSAGE]
  );
}

/**
 * The WASM instances in the running worker at `workerUrl` once `clients` clients connected to it and
 * one started its session: beekeeper instantiates its WASM only then.
 */
async function wasmInstancesOnceStarted(page: Page, workerUrl: string, clients: number): Promise<number> {
  let counts: WorkerCounts = { wasmInstances: 0, clients: 0 };
  await expect
    .poll(
      async () => {
        counts = await countWorker(page, workerUrl);
        return counts.clients >= clients && counts.wasmInstances > 0;
      },
      { message: `${clients} clients connect to ${workerUrl} and start it` }
    )
    .toBe(true);
  return counts.wasmInstances;
}

/** Writes a new safe storage generation as the wallet's write does (safe-storage-generation.ts) */
function writeGenerationFromWallet(writer: Page, generation: string): Promise<void> {
  return writer.evaluate((value) => {
    window.localStorage.setItem(
      'hbauth-safe-storage-generation',
      JSON.stringify({ value, expiresAt: null, createdAt: Date.now() })
    );
  }, { generation, writer: '/wallet', writerWorker: null });
}

/**
 * Opens the post, logged in, in each of `pages`, then plays GENERATION_CHANGES writes of another app:
 * each starts one worker, with one WASM instance, which replaces the last one in every page.
 */
async function expectOneWorkerPerGenerationChange(pages: Page[], context: BrowserContext, browser: Browser) {
  const workerLoads = await countWorkerLoads(context);
  const liveWorkers = await watchLiveWorkers(browser);

  for (const page of pages) await gotoPostLoggedIn(page);
  await expect.poll(liveWorkers).toHaveLength(1);
  expect(workerLoads).toHaveLength(1);
  expect(await wasmInstancesOnceStarted(pages[0], liveWorkers()[0], pages.length)).toBe(1);

  const writer = await context.newPage();
  await writer.goto('/auth/worker.js');
  for (let change = 1; change <= GENERATION_CHANGES; change++) {
    const generation = `spec-generation-${change}`;
    await writeGenerationFromWallet(writer, generation);

    await expect.poll(liveWorkers, `the worker of generation ${change} replaces the last one`).toEqual([
      expect.stringContaining(`storage=${generation}`)
    ]);
    expect(workerLoads, 'one worker per generation change').toHaveLength(change + 1);
    const [currentWorker] = liveWorkers();
    expect(
      await wasmInstancesOnceStarted(pages[0], currentWorker, pages.length),
      'one WASM instance in the running worker'
    ).toBe(1);
  }
}

test.describe('hb-auth worker replacement', () => {
  test('HBAUTH-WORKER-01 — five generation changes start one worker each and leave one running, with one WASM instance', async ({
    page,
    context,
    browser
  }) => {
    await expectOneWorkerPerGenerationChange([page], context, browser);
  });

  test('HBAUTH-WORKER-02 — the tabs of the app move to one worker per generation change, with one WASM instance', async ({
    page,
    context,
    browser
  }) => {
    const otherTabs = await Promise.all(Array.from({ length: TABS - 1 }, () => context.newPage()));
    await expectOneWorkerPerGenerationChange([page, ...otherTabs], context, browser);
  });
});
