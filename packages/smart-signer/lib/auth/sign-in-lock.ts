/** Refusal of a sign-in while another one started on this page is still pending */
export class SignInPendingError extends Error {
  name = 'SignInPendingError';
  /** smart-signer translation key of the message for the user */
  readonly translationKey: string;

  /** `inWalletExtension`: whether the pending sign-in waits for an answer in a wallet extension */
  constructor(inWalletExtension: boolean) {
    super('Another sign-in is still pending');
    this.translationKey = inWalletExtension ? 'login_form.sign_in_pending' : 'login_form.sign_in_pending_generic';
  }
}

let pendingSignIn: Promise<void> | null = null;
let pendingInWalletExtension = false;

/**
 * Runs `signIn` unless a sign-in started on this page is still pending. A signing request sent
 * to an extension while another is pending makes it drop the first ("User ignored this transaction"),
 * and a form that unmounts does not withdraw its request, so the lock lives in module scope rather
 * than in the form.
 *
 * Resolves once `signIn` succeeds, or rejects with its error. A call made while a sign-in is pending
 * sends nothing and rejects at once with `SignInPendingError`; the pending sign-in's own caller handles
 * its outcome. The lock is freed when the pending sign-in settles or by `cancelPendingSignIn`.
 * `inWalletExtension` tells whether `signIn` waits for an answer in a wallet extension, for the
 * message of a sign-in refused meanwhile.
 */
export async function runExclusiveSignIn(signIn: () => Promise<void>, inWalletExtension: boolean): Promise<void> {
  if (pendingSignIn) throw new SignInPendingError(pendingInWalletExtension);
  const run = signIn();
  pendingSignIn = run;
  pendingInWalletExtension = inWalletExtension;
  try {
    await run;
  } finally {
    // A sign-in whose lock was already freed must not free the lock of a newer one
    if (pendingSignIn === run) pendingSignIn = null;
  }
}

/**
 * Frees the lock of the pending sign-in now: the user asked for it or closed the sign-in dialog. The
 * pending request is not withdrawn from the extension: a new one may make it drop the old one, whose
 * caller then reports that.
 */
export function cancelPendingSignIn(): void {
  pendingSignIn = null;
}
