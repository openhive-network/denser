import { getChain } from '@transaction/lib/chain';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { PasswordFormMode, type PasswordFormOptions } from '@smart-signer/components/password-form';
import {
  importKeysIntoSafeStorage,
  keysHeldInSafeStorage,
  type KeyCheck,
  type WifKey
} from '@smart-signer/lib/signer/safe-storage-import';
import { findWrongSafeStoragePassword } from '@smart-signer/lib/wrong-safe-storage-password';
import { notifySafeStorageKeysChanged, requestPersistentKeyStorage } from '@smart-signer/lib/signer/safe-storage-keys';
import type { OperationSummary } from '@smart-signer/lib/signer/operation-summary';
import { SignedOutError } from '@transaction/lib/signed-out';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const WRONG_PASSWORD_KEY = 'broadcast_error.wrong_safe_storage_password';

async function getKeyCheck(): Promise<KeyCheck> {
  const chain = await getChain();
  return {
    publicKeyOf: (wif) => chain.calculatePublicKey(wif),
    signingKeyOf: (digest, signature) => chain.getPublicKeyFromSignature(digest, signature)
  };
}

/** The keys of `keys` the safe storage of `username` already holds, as `keysHeldInSafeStorage` tells. */
export async function findKeysHeldInSafeStorage(username: string, keys: readonly WifKey[]): Promise<WifKey[]> {
  const check = await getKeyCheck();
  return hbauthService.withOnlineClient((client) => keysHeldInSafeStorage(client, username, keys, check));
}

/**
 * Asks for the safe storage password of `username`, a new one when safe storage does not know the
 * account, and imports `keys` into safe storage with it, as `importKeysIntoSafeStorage` does, from
 * within the prompt: a wrong password keeps it open. Leaves the wallet unlocked.
 *
 * Resolves true once imported and checked, false when the prompt was closed.
 *
 * @throws the import's error, when it failed for another reason than the password
 * @throws {SignedOutError} when the user signed out while asked
 */
export async function importWithSafeStoragePassword(
  username: string,
  keys: readonly WifKey[],
  operation?: OperationSummary
): Promise<boolean> {
  const check = await getKeyCheck();
  const isNewWallet = !(await hbauthService.withOnlineClient((client) => client.getRegisteredUserByUsername(username)));
  let failure: { error: unknown } | undefined;
  const validatePassword = async (password: string): Promise<string | null> => {
    try {
      await hbauthService.withOnlineClient((client) =>
        importKeysIntoSafeStorage(client, username, password, keys, check)
      );
      return null;
    } catch (error) {
      if (findWrongSafeStoragePassword(error)) return WRONG_PASSWORD_KEY;
      failure = { error };
      return null;
    }
  };
  const passwordFormOptions: PasswordFormOptions = {
    mode: PasswordFormMode.HBAUTH,
    isNewPassword: isNewWallet,
    showRememberKey: false,
    validatePassword,
    i18nKeysForCaptions: {
      title: 'key_protection.password_title',
      description: isNewWallet ? 'key_protection.password_description_new' : 'key_protection.password_description_existing',
      inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
      submitButtonName: 'key_protection.protect_button'
    },
    i18nValues: { username },
    operation
  };
  try {
    await PasswordDialogModalPromise({ isOpen: true, passwordFormOptions });
  } catch (error) {
    if (error instanceof SignedOutError) throw error;
    logger.info('Safe storage password not entered: %s', error instanceof Error ? error.message : String(error));
    return false;
  }
  if (failure) throw failure.error;
  requestPersistentKeyStorage();
  notifySafeStorageKeysChanged();
  return true;
}
