import { useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useProcessAuth } from '@smart-signer/components/auth/process';
import { KeyType, LoginType } from '@smart-signer/types/common';

/**
 * Signs in to a Hive account through its passkey signer in one click: the account's signer and
 * posting key must be known already (`rememberPasskeyBinding`, as a graduation leaves them); the
 * signer signs the login challenge in its popup. Rejects with the signer's or the login's error.
 */
export function usePasskeySignIn(authenticateOnBackend: boolean, strict: boolean) {
  const { signAuth, submitAuth } = useProcessAuth(authenticateOnBackend, strict);
  const [, setLastLoggedInUser] = useLocalStorage<string>('lastLoggedInUser', '');

  return useCallback(
    async (username: string) => {
      await signAuth({ loginType: LoginType.passkey, username, keyType: KeyType.posting, remember: false });
      await submitAuth();
      setLastLoggedInUser(username);
    },
    [signAuth, submitAuth, setLastLoggedInUser]
  );
}
