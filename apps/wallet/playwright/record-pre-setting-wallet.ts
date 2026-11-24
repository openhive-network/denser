/**
 * Records tests/mock/safe-storage/pre-setting-wallet.json: the IndexedDB of a safe-storage wallet
 * made by the hb-auth build pinned before the check before active-key operations existed, so its
 * beekeeper wallet has no protected-setting marker key and safe storage no setting record. The
 * build comes from the registry tarball into a temporary directory, outside the workspace's catalog
 * and lockfile. The wallet holds the fixture account's shared posting and active key, a key of no
 * real account, under the fixture password. See tests/mock/safe-storage/README.md.
 *
 *   node apps/wallet/playwright/record-pre-setting-wallet.ts
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';
import { dumpIndexedDb } from './tests/support/indexedDbDump.ts';

const HB_AUTH = '@hiveio/hb-auth@1.28.4-rc0-stable.261028220752';
const HB_AUTH_TARBALL =
  'https://gitlab.syncad.com/api/v4/projects/429/packages/npm/@hiveio/hb-auth/-/@hiveio/hb-auth-1.28.4-rc0-stable.261028220752.tgz';
/** The registry's `dist.shasum` of that tarball */
const HB_AUTH_SHASUM = '030b9c0e7cdb063c528dc8bf89561a6d8fe460de';

/** STUB_ACCOUNT of tests/support/walletApiStub.ts */
const USERNAME = 'gtg';
/** activeCheck.spec.ts's SHARED_WIF: `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')` */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SAFE_STORAGE_PASSWORD = 'fixture-password';

const OUTPUT = new URL('./tests/mock/safe-storage/pre-setting-wallet.json', import.meta.url);

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.wasm': 'application/wasm'
};

async function fetchHbAuth(directory: string): Promise<string> {
  const response = await fetch(HB_AUTH_TARBALL);
  if (!response.ok) throw new Error(`Fetching ${HB_AUTH} failed: HTTP ${response.status}`);
  const tarball = Buffer.from(await response.arrayBuffer());
  const shasum = createHash('sha1').update(tarball).digest('hex');
  if (shasum !== HB_AUTH_SHASUM) throw new Error(`${HB_AUTH} has shasum ${shasum}, not ${HB_AUTH_SHASUM}`);
  const archive = join(directory, 'hb-auth.tgz');
  await writeFile(archive, tarball);
  execFileSync('tar', ['-xzf', archive, '-C', directory]);
  return join(directory, 'package', 'dist');
}

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

async function record(origin: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${origin}/`);
    await page.evaluate(
      async ({ username, wif, password }) => {
        interface PreSettingClient {
          initialize(chain: unknown): Promise<unknown>;
          register(username: string, password: string, wif: string, keyType: string, strict: boolean): Promise<unknown>;
          logout(username: string): Promise<void>;
        }
        const moduleUrl = '/hb-auth/hb-auth.js';
        const hbAuth: { OfflineClient: new (options: { workerUrl: string }) => PreSettingClient } = await import(moduleUrl);
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
      { username: USERNAME, wif: SHARED_WIF, password: SAFE_STORAGE_PASSWORD }
    );
    return await dumpIndexedDb(page);
  } finally {
    await browser.close();
  }
}

const directory = await mkdtemp(join(tmpdir(), 'hb-auth-pre-setting-'));
try {
  const server = await serve(await fetchHbAuth(directory));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('The recorder page server has no port');
    const dump = await record(`http://127.0.0.1:${address.port}`);
    await writeFile(OUTPUT, `${JSON.stringify({ recordedWith: HB_AUTH, username: USERNAME, ...dump }, null, 2)}\n`);
  } finally {
    server.close();
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
