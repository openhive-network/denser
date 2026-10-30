import { useQueryClient } from '@tanstack/react-query';
import { useSignOut } from '@smart-signer/lib/auth/use-sign-out';
import { useUser } from '@smart-signer/lib/auth/use-user';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { findAccount } from '@smart-signer/lib/auth/accounts';
import { clearStoredCredentials, destroyAccountSigner } from '@smart-signer/lib/auth/destroy-signer';
import { LOGOUT_ANSWER_TIMEOUT_MS, announceLogoutDone, clearLogoutDone } from '@smart-signer/lib/auth/logout-done';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { useRouter } from 'next/navigation';

/** Whether `promise` settles within `ms`; never rejects */
function settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  return Promise.race([promise.then(() => true), timeout]).finally(() => clearTimeout(timer));
}

export function useLogout(redirect?: string) {
  const signOut = useSignOut();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * @param leaveTo read once the server has ended the session (or the wait for it timed out):
   *   where to take the reader from a page that has nothing to show a signed-out reader, or
   *   undefined to stay, such as when the reader has meanwhile moved on
   */
  const onLogout = async (leaveTo?: () => string | undefined) => {
    // Read before signing out clears them
    const remembered = userLocalStorage.getAccounts();
    const accounts =
      user.isLoggedIn && !findAccount(remembered, user.username) ? [...remembered, user] : remembered;

    // Clear observer cookie immediately — SSR stops personalizing
    document.cookie = 'observer=; path=/; max-age=0';

    // Before the signed-out user reaches other tabs, so they wait for this logout's answer
    clearLogoutDone();

    // Trigger sign out mutation and wait for server response to ensure
    // the Set-Cookie header (which clears iron-session) is processed
    // before any navigation occurs. A logout that never answers must not hold the reader.
    const isSignedOut = signOut.mutateAsync().then(
      () => true,
      // Server logout may have failed, but proceed with local cleanup.
      // onMutate already applied optimistic update; onError may have rolled
      // it back, but navigation below will load fresh state from the server.
      () => false
    );
    // Only on the server's answer: other tabs that time out go on by themselves
    void isSignedOut.then(announceLogoutDone);
    if (!(await settlesWithin(isSignedOut, LOGOUT_ANSWER_TIMEOUT_MS))) {
      // The page the reader is taken to below is rendered while the session is still open:
      // render it again once the server has ended it
      void isSignedOut.then((hasEnded) => {
        if (hasEnded) router.refresh();
      });
    }

    // Only now, so the next page renders without the ended session's cookie
    const leavePath = leaveTo?.();
    if (leavePath) router.replace(leavePath);

    // Stored keys and tokens must not outlive the session, whichever account they belong to
    clearStoredCredentials();

    // Redirect immediately if specified
    if (redirect) {
      // Clear all non-user queries to force loading states on the current page.
      // This provides instant visual feedback while the navigation completes,
      // preventing stale page content from being visible during the redirect.
      queryClient.removeQueries({
        predicate: (query) => {
          const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
          return firstKey !== QUERY_KEY.user;
        }
      });
      router.push(redirect);
    }

    // Signer cleanup for every account the session ended, in background (fire and forget)
    for (const account of accounts) {
      void destroyAccountSigner(account);
    }
  };
  return onLogout;
}
