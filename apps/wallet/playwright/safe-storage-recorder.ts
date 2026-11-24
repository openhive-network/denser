/**
 * Records the IndexedDB of a safe-storage wallet made by an hb-auth build's `dist` into a JSON file
 * under tests/mock/safe-storage/, for a spec to restore with `restoreIndexedDb`. The wallet holds
 * the fixture account's shared posting and active key, a key of no real account, under the password
 * given. See tests/mock/safe-storage/README.md.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';
import { dumpIndexedDb } from './tests/support/indexedDbDump.ts';

/** STUB_ACCOUNT of tests/support/walletApiStub.ts */
const USERNAME = 'gtg';
/** activeCheck.spec.ts's SHARED_WIF: `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')` */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.wasm': 'application/wasm'
};

const RECORDER_PAGE = '<!doctype html><title>hb-auth recorder</title>';

/** Serves an empty page at `/` and hb-auth's `dist` under `/hb-auth/` */
function serve(dist: string): Promise<Server> {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path === '/') {
      response.writeHead(200, { 'content-type': CONTENT_TYPES['.html'] }).end(RECORDER_PAGE);
      return;
    }
    const file = normalize(path.replace(/^\/hb-auth\//, ''));
    if (!path.startsWith('/hb-auth/') || file.startsWith('..')) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(join(dist, file));
      response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function record(origin: string, password: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${origin}/`);
    await page.evaluate(
      async ({ username, wif, password }) => {
        interface RecorderClient {
          initialize(chain: unknown): Promise<unknown>;
          register(username: string, password: string, wif: string, keyType: string, strict: boolean): Promise<unknown>;
          logout(username: string): Promise<void>;
        }
        const moduleUrl = '/hb-auth/hb-auth.js';
        const hbAuth: { OfflineClient: new (options: { workerUrl: string }) => RecorderClient } = await import(moduleUrl);
        // Enough of a wax chain for OfflineClient's verification transaction, which it does not check
        const chain = {
          createTransactionWithTaPoS: () => ({
            sigDigest: '1'.repeat(64),
            pushOperation: () => undefined,
            validate: () => undefined,
            addSignature: () => undefined
          })
        };
        const client = new hbAuth.OfflineClient({ workerUrl: '/hb-auth/worker.js' });
        await client.initialize(chain);
        await client.register(username, password, wif, 'posting', true);
        await client.register(username, password, wif, 'active', true);
        await client.logout(username);
      },
      { username: USERNAME, wif: SHARED_WIF, password }
    );
    return await dumpIndexedDb(page);
  } finally {
    await browser.close();
  }
}

/**
 * Makes the wallet with the hb-auth build in `dist` and writes its IndexedDB to `output`, with
 * `recordedWith` naming that build and `extra` fields the spec reads
 */
export async function recordSafeStorageWallet({
  dist,
  recordedWith,
  password,
  output,
  extra = {}
}: {
  dist: string;
  recordedWith: string;
  password: string;
  output: URL;
  extra?: Record<string, unknown>;
}): Promise<void> {
  const server = await serve(dist);
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('The recorder page server has no port');
    const dump = await record(`http://127.0.0.1:${address.port}`, password);
    await writeFile(output, `${JSON.stringify({ recordedWith, username: USERNAME, ...extra, ...dump }, null, 2)}\n`);
  } finally {
    server.close();
  }
}
