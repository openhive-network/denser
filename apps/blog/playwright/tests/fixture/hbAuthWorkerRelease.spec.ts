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
 * Live workers are read off the browser's targets (CDP); the WASM instances in each from a counter
 * the spec adds to the worker script. Another app's write is played by writing the generation record
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
const COUNT_WASM_MESSAGE = 'spec:count-wasm';

// Appended to the worker module: its imports run first, and beekeeper instantiates its WASM later,
// when a client starts its session
const WASM_COUNTER = `
let specWasmInstances = 0;
for (const name of ['instantiate', 'instantiateStreaming']) {
  const instantiate = WebAssembly[name];
  WebAssembly[name] = (...args) => instantiate.apply(WebAssembly, args).then((result) => {
    specWasmInstances += 1;
    return result;
  });
}
self.addEventListener('connect', (event) => {
  const port = event.ports[0];
  port.addEventListener('message', ({ data }) => {
    if (data?.type === '${COUNT_WASM_MESSAGE}') port.postMessage({ wasmInstances: specWasmInstances });
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

/** The WASM instances the running worker at `workerUrl` created */
function countWasmInstances(page: Page, workerUrl: string): Promise<number> {
  return page.evaluate(
    ([url, type]) =>
      new Promise<number>((resolve) => {
        // As hb-auth connects: a connection with other options fails
        const options: WorkerOptions & { extendedLifetime: boolean } = { type: 'module', extendedLifetime: true };
        const port = new SharedWorker(url, options).port;
        port.onmessage = ({ data }) => resolve(data.wasmInstances);
        port.postMessage({ type });
      }),
    [workerUrl, COUNT_WASM_MESSAGE]
  );
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

test.describe('hb-auth worker replacement', () => {
  test('HBAUTH-WORKER-01 — five generation changes start one worker each and leave one running, with one WASM instance', async ({
    page,
    context,
    browser
  }) => {
    const workerLoads = await countWorkerLoads(context);
    const liveWorkers = await watchLiveWorkers(browser);

    await gotoPostLoggedIn(page);
    await expect.poll(liveWorkers).toHaveLength(1);
    expect(workerLoads).toHaveLength(1);
    expect(await countWasmInstances(page, liveWorkers()[0])).toBe(1);

    const writer = await context.newPage();
    await writer.goto('/auth/worker.js');
    for (let change = 1; change <= GENERATION_CHANGES; change++) {
      const generation = `spec-generation-${change}`;
      await writeGenerationFromWallet(writer, generation);

      await expect.poll(liveWorkers, `the worker of generation ${change} replaces the last one`).toEqual([
        expect.stringContaining(`storage=${generation}`)
      ]);
      expect(workerLoads, 'one client per generation change').toHaveLength(change + 1);
      const [currentWorker] = liveWorkers();
      expect(await countWasmInstances(page, currentWorker), 'one WASM instance in the running worker').toBe(1);
    }
  });
});
