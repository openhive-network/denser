import type { CheckCredential } from '@hiveio/hb-auth';

// The sign-in's credential, by username, while its login transaction is signed
const signInChecks = new Map<string, CheckCredential>();

/**
 * What `signIn` resolves with: the sign-in of `username` that `credential` just unlocked safe
 * storage with, its login transaction signed with that credential where the wallet asks for the
 * check before active-key operations, so that signing in stays one prompt. The credential is held
 * for one signature, and dropped once `signIn` settles.
 */
export async function withSignInCheck<T>(
  username: string,
  credential: CheckCredential | undefined,
  signIn: () => Promise<T>
): Promise<T> {
  if (credential) signInChecks.set(username, credential);
  try {
    return await signIn();
  } finally {
    signInChecks.delete(username);
  }
}

/** The credential `withSignInCheck` holds for `username`'s login transaction, once */
export function takeSignInCheck(username: string): CheckCredential | undefined {
  const credential = signInChecks.get(username);
  signInChecks.delete(username);
  return credential;
}
