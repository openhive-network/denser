/**
 * What a HiveAuth wallet app signs to prove a sign-in: it cannot sign the login transaction other
 * login methods sign, only a text challenge (its SHA-256 digest, as Keychain's `signBuffer` does).
 */
export function hiveAuthLoginMessage(loginChallenge: string): string {
  return JSON.stringify({ loginChallenge });
}
