import { dispatchAuthStorageDesync } from '@smart-signer/lib/auth/auth-storage-desync';
import { announceLogoutDone, clearLogoutDone } from '@smart-signer/lib/auth/logout-done';
import { notifyOwnLogout } from '@smart-signer/lib/auth/logout-notice';
import { getLogger } from '@ui/lib/logging';
import { appApiPath } from '@ui/lib/app-api-path';

const logger = getLogger('app');

/** The desync logout whose answer has not come yet: one desync can reach the error handler more than once */
let pendingDesyncLogout: Promise<void> | null = null;

/**
 * Perform emergency logout when IndexedDB key storage is lost.
 * This runs outside React — clears cookie, posts to logout API,
 * and dispatches event for React Query to pick up.
 * Does nothing while an earlier one waits for its answer.
 */
export function performDesyncLogout(): void {
  if (pendingDesyncLogout) return;

  // As a sign-out does: every account unlocked in this app's hb-auth workers, also one this page does
  // not know of, and in any worker of the origin no page hears of this logout from
  notifyOwnLogout();

  // Clear observer cookie immediately — SSR stops personalizing
  document.cookie = 'observer=; path=/; max-age=0';

  // Before the signed-out user reaches other tabs, so they wait for this logout's answer
  clearLogoutDone();

  // Clear user from localStorage so next page load starts logged out
  try {
    const defaultUser = JSON.stringify({
      isLoggedIn: false,
      username: '',
      avatarUrl: '',
      loginType: 'hbauth',
      keyType: 'posting',
      authenticateOnBackend: false
    });
    localStorage.setItem('user', defaultUser);
  } catch {
    // localStorage may be unavailable — cookie clear is sufficient
  }

  // POST to logout API to destroy server session (fire and forget); other tabs go on on its answer
  // Header value must match csrfHeaderName in @smart-signer/lib/csrf-protection.ts
  pendingDesyncLogout = fetch(appApiPath('/api/auth/logout'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': '1'
    }
  })
    .then(() => undefined)
    .catch(err => logger.error('Desync logout API call failed: %o', err))
    .finally(() => {
      pendingDesyncLogout = null;
      announceLogoutDone();
    });

  // Dispatch event so React Query invalidates user state
  dispatchAuthStorageDesync();
}
