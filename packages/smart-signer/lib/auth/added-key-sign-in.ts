import type { KeyAuthorityType, OnlineClient } from '@hiveio/hb-auth';

/** What signing in with a key just added to safe storage needs of hb-auth's client */
export type AddedKeySignInClient = Pick<OnlineClient, 'authenticate' | 'logout'>;

/**
 * How the sign-in after Add New Key ended: `signed-in`; `pending` when another sign-in held the
 * lock, so none was sent; `cancelled` when the dialog was closed before the sign-in was sent.
 */
export type AddedKeySignInOutcome = 'signed-in' | 'pending' | 'cancelled';

export interface AddedKeySignIn {
  username: string;
  /** The safe storage password */
  password: string;
  keyType: KeyAuthorityType;
  /** Signs in to the app with the key safe storage holds unlocked; false when it did not run */
  signIn: () => Promise<boolean>;
  /** Whether the user closed the dialog meanwhile */
  isCancelled: () => boolean;
}

/**
 * Unlocks the added key with the password, as the unlock step does (hb-auth adds a key to a wallet
 * it holds unlocked without checking the password), then signs in with it unless the dialog was
 * closed meanwhile: a wallet unlocked by then is locked again, so closing leaves the user signed out
 * with the key still stored. Rejects with the error of `authenticate` or `signIn`.
 */
export async function signInWithAddedKey(
  client: AddedKeySignInClient,
  { username, password, keyType, signIn, isCancelled }: AddedKeySignIn
): Promise<AddedKeySignInOutcome> {
  if (isCancelled()) return 'cancelled';
  await client.authenticate(username, password, keyType);
  if (isCancelled()) {
    await client.logout(username);
    return 'cancelled';
  }
  return (await signIn()) ? 'signed-in' : 'pending';
}
