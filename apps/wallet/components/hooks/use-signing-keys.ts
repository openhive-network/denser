import { useQuery } from '@tanstack/react-query';
import type { User } from '@smart-signer/types/common';
import { useStoredKeyTypes } from '@smart-signer/lib/auth/use-login-authority';
import { getTabWif } from '@smart-signer/lib/signer/tab-credentials';
import { passkeyBindingOf } from '@smart-signer/lib/passkey/passkey-binding';
import { getChain } from '@transaction/lib/chain';
import { loginMethodOf } from '@/wallet/lib/account-keys';
import { NO_SIGNING_KEYS, type SigningKeys } from '@/wallet/lib/authority-checks';

export interface AccountSigningKeys {
  /** What the signed-in session signs with */
  session: SigningKeys;
  /** What safe storage holds in this browser, known for a safe storage session only */
  safeStorage: SigningKeys;
  /** The posting key the passkey signer derives for the account */
  passkey: SigningKeys;
}

const NONE: AccountSigningKeys = { session: NO_SIGNING_KEYS, safeStorage: NO_SIGNING_KEYS, passkey: NO_SIGNING_KEYS };

/**
 * The session's keys: the key it signed in with, when known exactly, and besides it a WIF session's
 * keys it keeps in this tab, else the role it signed in with; a passkey session's the posting key its
 * signer derives; a safe storage session's the roles it holds a key of; a signer's the role it
 * signed in with.
 */
async function readSigningKeys(user: User, storedKeyTypes: readonly string[]): Promise<AccountSigningKeys> {
  const { username, loginType, keyType, signInPublicKey } = user;
  const roles = [...new Set([keyType, ...storedKeyTypes])];
  const signInKeys = signInPublicKey ? [signInPublicKey] : [];
  const binding = passkeyBindingOf(username);
  const passkey = binding ? { publicKeys: [binding.publicKey], roles: [] } : NO_SIGNING_KEYS;
  switch (loginMethodOf(loginType)) {
    case 'wif': {
      const heldWifs = roles.flatMap((role) => getTabWif(username, role) ?? []);
      const chain = heldWifs.length ? await getChain() : undefined;
      return {
        session: {
          publicKeys: [...signInKeys, ...(chain ? heldWifs.map((wif) => chain.calculatePublicKey(wif)) : [])],
          roles: roles.filter((role) => getTabWif(username, role) === null)
        },
        safeStorage: NO_SIGNING_KEYS,
        passkey
      };
    }
    case 'safe_storage':
      return { session: { publicKeys: signInKeys, roles }, safeStorage: { publicKeys: [], roles }, passkey };
    case 'passkey':
      return { session: passkey, safeStorage: NO_SIGNING_KEYS, passkey };
    default:
      return { session: { publicKeys: signInKeys, roles: [keyType] }, safeStorage: NO_SIGNING_KEYS, passkey };
  }
}

/**
 * The keys `user`'s session, safe storage and passkey signer sign `username`'s account with: none
 * unless `user` is signed in as `username`.
 */
export function useSigningKeys(user: User, username: string): AccountSigningKeys {
  const own = user.isLoggedIn && user.username === username;
  const { keyTypes, isPending } = useStoredKeyTypes(user);
  const query = useQuery({
    queryKey: ['signingKeys', user.loginType, username, user.keyType, user.signInPublicKey, keyTypes],
    queryFn: () => readSigningKeys(user, keyTypes ?? []),
    enabled: own && !isPending
  });
  return (own && query.data) || NONE;
}
