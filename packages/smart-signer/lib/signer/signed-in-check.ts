import { SignedOutError } from '@transaction/lib/signed-out';
import { getUser } from '@smart-signer/lib/auth/user-localstore';
import { isStorageAvailable } from '@smart-signer/lib/utils';

function isStoredUser(username: string): boolean {
  const user = getUser();
  return user.isLoggedIn && user.username === username;
}

/**
 * Throws `SignedOutError` unless the stored user, which a sign-out or an account switch in any tab
 * replaces at once, is `username` signed in. This tab hears of another tab's sign-out only once its
 * storage event is delivered; the stored user already tells. Without localStorage no user is
 * stored, nor any sign-out shared between tabs, so nothing is checked.
 */
export function requireStillSignedInAs(username: string): void {
  if (!isStorageAvailable('localStorage')) return;
  if (!isStoredUser(username)) throw new SignedOutError();
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

/**
 * What `askUser` resolves with, checked as `askWhileSignedIn` does when `username` was the
 * signed-in user as the dialog opened. A dialog opened by a sign-in, before the user is stored, is
 * not checked.
 *
 * @throws {SignedOutError} when `username`, signed in as asked, is no longer the signed-in user
 */
export async function askWhileSignedInIfSo<T>(username: string, askUser: () => Promise<T>): Promise<T> {
  if (!isStoredUser(username)) return askUser();
  return askWhileSignedIn(username, askUser);
}
