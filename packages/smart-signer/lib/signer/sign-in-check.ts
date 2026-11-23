import type { CheckCredential, KeyAuthorityType } from '@hiveio/hb-auth';

/** The sign-in's credential, and the key type its login transaction signs with */
interface SignInCheck {
  keyType: KeyAuthorityType;
  credential: CheckCredential;
}

// The sign-in's credential, by username, while its login transaction is signed
const signInChecks = new Map<string, SignInCheck>();

/**
 * What `signIn` resolves with: the sign-in of `username` with its `keyType` key that `credential`
 * just unlocked safe storage with, its login transaction signed with that credential where the
 * wallet asks for the check before active-key operations, so that signing in stays one prompt. The
 * credential is held for one signature with the `keyType` key, and dropped once `signIn` settles.
 */
export async function withSignInCheck<T>(
  username: string,
  keyType: KeyAuthorityType,
  credential: CheckCredential | undefined,
  signIn: () => Promise<T>
): Promise<T> {
  if (credential) signInChecks.set(username, { keyType, credential });
  try {
    return await signIn();
  } finally {
    signInChecks.delete(username);
  }
}

/**
 * The credential `withSignInCheck` holds for `username`'s login transaction, once, when it signs
 * with the `keyType` key; undefined for a signature with another key, which the sign-in did not check
 */
export function takeSignInCheck(username: string, keyType: KeyAuthorityType): CheckCredential | undefined {
  const signInCheck = signInChecks.get(username);
  if (signInCheck?.keyType !== keyType) return undefined;
  signInChecks.delete(username);
  return signInCheck.credential;
}
