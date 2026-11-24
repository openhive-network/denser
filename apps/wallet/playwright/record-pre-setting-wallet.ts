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
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordSafeStorageWallet } from './safe-storage-recorder.ts';

const HB_AUTH = '@hiveio/hb-auth@1.28.4-rc0-stable.261028220752';
const HB_AUTH_TARBALL =
  'https://gitlab.syncad.com/api/v4/projects/429/packages/npm/@hiveio/hb-auth/-/@hiveio/hb-auth-1.28.4-rc0-stable.261028220752.tgz';
/** The registry's `dist.shasum` of that tarball */
const HB_AUTH_SHASUM = '030b9c0e7cdb063c528dc8bf89561a6d8fe460de';

const SAFE_STORAGE_PASSWORD = 'fixture-password';

const OUTPUT = new URL('./tests/mock/safe-storage/pre-setting-wallet.json', import.meta.url);

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

const directory = await mkdtemp(join(tmpdir(), 'hb-auth-pre-setting-'));
try {
  await recordSafeStorageWallet({
    dist: await fetchHbAuth(directory),
    recordedWith: HB_AUTH,
    password: SAFE_STORAGE_PASSWORD,
    output: OUTPUT
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}
