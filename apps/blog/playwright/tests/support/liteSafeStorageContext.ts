import { execFileSync } from 'node:child_process';
import { expect, type Page } from '@playwright/test';
import { CHAIN_ID } from './litePasskeyContext';

/**
 * Shared helpers of the lite Safe Storage spec (`liteIdentitySafeStorage.spec.ts`): the Secure in
 * Safe Storage dialog, what hb-auth's wallet holds for the lite entry, and the signatures of the
 * relayed transactions checked with @hiveio/lite-account.
 */

export const SAFE_STORAGE_PASSWORD = 'lite safe storage 1';

/** hb-auth's username of a lite entry: the DID tagged with the posting key (lite-wallet.ts). */
export const liteWalletUsername = (name: string, postingPublicKey: string) =>
  `did:lite:${name}:${postingPublicKey.slice(3, 11)}`;

/**
 * Whether the browser offers a passkey to unlock with, as hb-auth asks it (WebAuthn's PRF client
 * capability): set before the page loads, as Chromium's answer depends on the machine.
 */
export async function reportPasskeySupport(page: Page, supported: boolean) {
  await page.addInitScript((prf) => {
    const credential = window.PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<unknown> } | undefined;
    if (credential) credential.getClientCapabilities = async () => ({ 'extension:prf': prf });
  }, supported);
}

/** Fills the open Secure dialog's Safe Storage form with `password` and submits it. */
export async function secureInSafeStorage(page: Page, password = SAFE_STORAGE_PASSWORD) {
  const dialog = page.getByTestId('lite-secure-dialog');
  const form = dialog.getByTestId('lite-safe-storage-form');
  await expect(form).toBeVisible({ timeout: 30_000 });
  await form.getByTestId('lite-safe-storage-password').fill(password);
  await form.getByTestId('lite-safe-storage-repeat').fill(password);
  await form.getByTestId('lite-safe-storage-confirm').click();
  return dialog;
}

/** Answers the smart-signer password dialog the unlock step opens with `password`. */
export async function unlockWith(page: Page, password: string) {
  const dialog = page.getByTestId('enter-password-to-unlock-key');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByTestId('posting-private-key-input').fill(password);
  await dialog.getByTestId('password-submit-button').click();
}

/** The key aliases hb-auth's wallet holds (`<username>@<keyType>`), read from its IndexedDB store. */
export const walletAliases = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const names = (await indexedDB.databases()).map((db) => db.name ?? '').filter((name) => name.startsWith('/aliases_'));
    const aliases: string[] = [];
    for (const name of names) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (db.objectStoreNames.contains('aliases')) {
        const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
          const request = db.transaction('aliases').objectStore('aliases').getAllKeys();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        aliases.push(...keys.map(String));
      }
      db.close();
    }
    return aliases;
  });

/** The browser's localStorage keys starting with `lite-`. */
export const liteStorageKeys = (page: Page): Promise<string[]> =>
  page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('lite-')));

export type SignedL2 = Record<string, unknown> & { signatures: string[] };

const VERIFY_SCRIPT = `
import { l2Digest, recoverPublicKey } from '@hiveio/lite-account';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const { txs, chainId } = JSON.parse(input);
const recovered = txs.map(({ signatures, ...fields }) => signatures.map((signature) => recoverPublicKey(l2Digest(fields, chainId), signature)));
process.stdout.write(JSON.stringify(recovered));
`;

/**
 * The public keys the signatures of each of `txs` recover to over its L2 digest on the fixture
 * chain, by @hiveio/lite-account in a node of its own: the package is ESM-only, which Playwright's
 * loader cannot import.
 */
export function recoveredKeys(txs: SignedL2[], chainId = CHAIN_ID): string[][] {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', VERIFY_SCRIPT], {
    input: JSON.stringify({ txs, chainId }),
    encoding: 'utf8'
  });
  return JSON.parse(output) as string[][];
}
