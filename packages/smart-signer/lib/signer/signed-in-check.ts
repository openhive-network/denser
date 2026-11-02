import { SignedOutError } from '@transaction/lib/signed-out';
import { getUser } from '@smart-signer/lib/auth/user-localstore';

/**
 * Throws `SignedOutError` unless the stored user, which a sign-out or an account switch in any tab
 * replaces at once, is `username` signed in. This tab hears of another tab's sign-out only once its
 * storage event is delivered; the stored user already tells.
 */
export function requireStillSignedInAs(username: string): void {
  const user = getUser();
  if (!user.isLoggedIn || user.username !== username) throw new SignedOutError();
}

/**
 * What `askUser` (a dialog asking for a key) resolves with, once `username` is found still signed
 * in: the user may have signed out, or switched account, while the dialog was open.
 *
 * @throws {SignedOutError} when `username` is no longer the signed-in user
 */
export async function askWhileSignedIn<T>(username: string, askUser: () => Promise<T>): Promise<T> {
  const answer = await askUser();
  requireStillSignedInAs(username);
  return answer;
}
