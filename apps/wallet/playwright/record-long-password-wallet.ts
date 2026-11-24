/**
 * Records tests/mock/safe-storage/long-password-wallet.json: the IndexedDB of a safe-storage wallet
 * whose password is longer than the 512 characters a new wallet's password may have now, as testers
 * set before that maximum applied. The maximum is the sign-in form's, so the workspace's own hb-auth
 * makes the wallet. The recording holds the password. See tests/mock/safe-storage/README.md.
 *
 *   node apps/wallet/playwright/record-long-password-wallet.ts
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { recordSafeStorageWallet } from './safe-storage-recorder.ts';

/** The length of the password testers set before the maximum applied */
const PASSWORD_LENGTH = 1140;
const SAFE_STORAGE_PASSWORD = 'denser-fixture-long-password-'.repeat(40).slice(0, PASSWORD_LENGTH);

const OUTPUT = new URL('./tests/mock/safe-storage/long-password-wallet.json', import.meta.url);

const manifestPath = createRequire(import.meta.url).resolve('@hiveio/hb-auth/package.json');
const manifest: { name: string; version: string } = JSON.parse(await readFile(manifestPath, 'utf8'));

await recordSafeStorageWallet({
  dist: join(dirname(manifestPath), 'dist'),
  recordedWith: `${manifest.name}@${manifest.version}`,
  password: SAFE_STORAGE_PASSWORD,
  output: OUTPUT,
  extra: { password: SAFE_STORAGE_PASSWORD }
});
