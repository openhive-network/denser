import { retryAfterGoogleSignIn } from '@smart-signer/lib/signer/google-drive-wallet-errors';

/**
 * Whether an operation signed with `keyType` asks for the wallet password first, as safe storage
 * does: every operation needing the active or owner key, whatever unlocked the wallet before, so
 * that no one at an unlocked device changes the account's authorities. Posting operations sign with
 * the wallet the sign-in opened.
 */
export function needsFreshPasswordCheck(keyType: string): boolean {
  return keyType === 'active' || keyType === 'owner';
}

/**
 * Signs one operation after a fresh password check. `askPassword` prompts for the password and
 * rejects when the prompt is closed, so nothing is signed. `signWithPassword` opens the wallet with
 * it and signs. When that fails for the Google session rather than the wallet file, `signInAgain`
 * drops the session and the same answer is tried once more. The password lives for this call only:
 * the next operation asks again.
 */
export async function signAfterFreshPassword(
  askPassword: () => Promise<string>,
  signWithPassword: (password: string) => Promise<void>,
  signInAgain: (error: unknown) => void
): Promise<void> {
  const password = await askPassword();
  await retryAfterGoogleSignIn(() => signWithPassword(password), signInAgain);
}
