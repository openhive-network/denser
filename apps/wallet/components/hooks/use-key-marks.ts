import { useMemo } from 'react';
import type { User } from '@smart-signer/types/common';
import { signingKeysIn, type RoleAuthority } from '@/wallet/lib/authority-checks';
import { useSigningKeys } from './use-signing-keys';

/** The public keys of an account that this session, safe storage and the passkey signer sign with */
export interface KeyMarks {
  session: ReadonlySet<string>;
  safeStorage: ReadonlySet<string>;
  passkey: ReadonlySet<string>;
}

/** Which keys of `authorities`, `username`'s, `user`'s signers hold: none on another account's page. */
export function useKeyMarks(user: User, username: string, authorities: readonly RoleAuthority[]): KeyMarks {
  const { session, safeStorage, passkey } = useSigningKeys(user, username);
  return useMemo(
    () => ({
      session: signingKeysIn(authorities, session),
      safeStorage: signingKeysIn(authorities, safeStorage),
      passkey: signingKeysIn(authorities, passkey)
    }),
    [authorities, session, safeStorage, passkey]
  );
}
