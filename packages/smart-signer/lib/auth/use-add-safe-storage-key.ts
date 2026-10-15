import { useCallback } from 'react';
import type { KeyAuthorityType } from '@hiveio/hb-auth';
import type { User } from '@smart-signer/types/common';
import { handleError } from '@ui/lib/handle-error';

async function addSafeStorageKey(
  { username, loginType, keyType }: Pick<User, 'username' | 'loginType' | 'keyType'>,
  addedKeyType: KeyAuthorityType
): Promise<void> {
  // The signer and its dialogs load only when a key is added
  const { SignerHbauth } = await import('@smart-signer/lib/signer/signer-hbauth');
  const signer = new SignerHbauth({ username, loginType, keyType, storageType: 'localStorage' });
  await signer.addKey(addedKeyType);
}

/**
 * Asks for a key and keeps it in safe storage next to the key `user`'s hbauth session signed in
 * with, without changing the session. Failures are reported to the user; a dismissed dialog is not.
 */
export function useAddSafeStorageKey({ username, loginType, keyType }: User): (addedKeyType: KeyAuthorityType) => void {
  return useCallback(
    (addedKeyType: KeyAuthorityType) => {
      addSafeStorageKey({ username, loginType, keyType }, addedKeyType).catch((error: unknown) =>
        handleError(error, { method: 'addSafeStorageKey', params: { username, keyType: addedKeyType } })
      );
    },
    [username, loginType, keyType]
  );
}
