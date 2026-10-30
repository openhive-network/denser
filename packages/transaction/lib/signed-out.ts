/**
 * Thrown instead of signing when no user is signed in, as after a sign-out in this tab or another
 * one: the signer of the user signed in before must not sign for the signed-out reader.
 */
export class SignedOutError extends Error {
  constructor() {
    super('No user is signed in to sign the transaction');
    this.name = 'SignedOutError';
  }
}

/**
 * Throws `SignedOutError` unless `signerOptions` name a user to sign as; the signer options of a
 * signed-out reader name none.
 */
export function requireSignedIn(signerOptions: { username?: string } | undefined): void {
  if (!signerOptions?.username) throw new SignedOutError();
}
