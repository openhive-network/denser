/** How long a sign-in left behind by a closed sign-in dialog keeps the lock before it is freed */
export const ABANDONED_SIGN_IN_TIMEOUT_MS = 3 * 60 * 1000;

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
let abandonTimer: ReturnType<typeof setTimeout> | undefined;

function releaseLock(): void {
  clearTimeout(abandonTimer);
  abandonTimer = undefined;
  pendingSignIn = null;
}

/**
 * Runs `signIn` unless a sign-in started on this page is still pending. A signing request sent
 * to an extension while another is pending makes it drop the first ("User ignored this transaction"),
 * and closing the sign-in dialog does not cancel the request, so the lock lives in module scope
 * rather than in the form.
 *
 * Resolves once `signIn` succeeds, or rejects with its error. A call made while a sign-in is pending
 * sends nothing and rejects at once with `SignInPendingError`; the pending sign-in's own caller handles
 * its outcome. The lock is freed when the pending sign-in settles, by `cancelPendingSignIn`, or
 * `ABANDONED_SIGN_IN_TIMEOUT_MS` after `abandonPendingSignIn`. `inWalletExtension` tells whether
 * `signIn` waits for an answer in a wallet extension, for the message of a sign-in refused meanwhile.
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
    if (pendingSignIn === run) releaseLock();
  }
}

/**
 * Marks the pending sign-in as left behind (its dialog was closed): unless it settles first, its lock
 * is freed after `ABANDONED_SIGN_IN_TIMEOUT_MS`, so an extension that never answers cannot block
 * every later sign-in until the page is reloaded.
 */
export function abandonPendingSignIn(): void {
  if (!pendingSignIn || abandonTimer !== undefined) return;
  abandonTimer = setTimeout(releaseLock, ABANDONED_SIGN_IN_TIMEOUT_MS);
}

/**
 * Frees the lock of the pending sign-in now, on the user's request. The pending request is not
 * withdrawn from the extension: a new one may make it drop the old one, whose caller then reports that.
 */
export function cancelPendingSignIn(): void {
  releaseLock();
}
