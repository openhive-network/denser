let pendingSignIn: Promise<void> | null = null;

/**
 * Runs `signIn` unless a sign-in started on this page is still pending. A signing request sent
 * to an extension while another is pending makes it drop the first ("User ignored this transaction"),
 * and closing the sign-in dialog does not cancel the request, so the lock lives in module scope
 * rather than in the form.
 *
 * A call refused this way sends nothing: it waits for the pending sign-in to settle, so its caller
 * keeps showing progress meanwhile, and resolves to `false`. The pending sign-in's own caller handles
 * its outcome. Otherwise it resolves to `true` once `signIn` succeeds, or rejects with its error.
 */
export async function runExclusiveSignIn(signIn: () => Promise<void>): Promise<boolean> {
  if (pendingSignIn) {
    await Promise.allSettled([pendingSignIn]);
    return false;
  }
  const run = signIn();
  pendingSignIn = run;
  try {
    await run;
    return true;
  } finally {
    pendingSignIn = null;
  }
}
