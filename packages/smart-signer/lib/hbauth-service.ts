import type { OnlineClient, OfflineClient } from '@hiveio/hb-auth';

import {
  getOnlineClient,
  getOfflineClient,
  logoutFromEveryWorker,
  logoutEveryoneFromStartedWorkers,
  logoutFromStartedWorkers,
  withOnlineClient,
  type OnlineClientOperationOptions
} from "@hive/common-hiveio-packages";
import { getLogger } from '@ui/lib/logging';
import { subscribeOtherTabLogout } from '@smart-signer/lib/auth/other-tab-logout';
import { subscribeAccountsChanged } from '@smart-signer/lib/auth/account-sync';

const logger = getLogger('app');

/** Asks for the safe storage password of `username` in the dialog signing asks for it in */
async function requestSafeStoragePassword(username: string): Promise<string> {
  // The dialog loads only for the operations that need it
  const [{ PasswordDialogModalPromise }, { PasswordFormMode }] = await Promise.all([
    import('@smart-signer/components/password-dialog'),
    import('@smart-signer/components/password-form')
  ]);
  const { password }: { password: string } = await PasswordDialogModalPromise({
    isOpen: true,
    passwordFormOptions: {
      mode: PasswordFormMode.HBAUTH,
      showInputStorePassword: false,
      i18nKeysForCaptions: {
        description: 'password_form.safe_storage_recovery_description',
        inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder'
      },
      i18nValues: { username }
    }
  });
  return password;
}

const OPERATION_OPTIONS: OnlineClientOperationOptions = { requestPassword: requestSafeStoragePassword };

class HbauthService {
  async getOnlineClient(): Promise<OnlineClient> {
    return await getOnlineClient();
  }
  async getOfflineClient(): Promise<OfflineClient> {
    return await getOfflineClient();
  }
  /** Runs `operation` with the online client; a key write it repeats in another worker asks for the password when needed */
  withOnlineClient<T>(operation: (client: OnlineClient) => Promise<T>): Promise<T> {
    return withOnlineClient(operation, OPERATION_OPTIONS);
  }
  async logout(username: string): Promise<void> {
    await logoutFromEveryWorker(username);
  }
}

export const hbauthService = new HbauthService();

// Another tab's logout locked the workers of its own app; the workers of this app, which may be
// another one, still hold the keys unlocked for every page of it. Every account is locked, also those
// this page never knew were signed in, as the logout ended the session of each.
subscribeOtherTabLogout(() => {
  logoutEveryoneFromStartedWorkers().catch((error: unknown) => {
    logger.error(error, 'Failed to lock the safe storage keys after another tab logged out');
  });
});

// Likewise for an account another tab removed: its signer ended the account's session in its own app
// only. Not on the server, which renders this module's importers and has no tabs.
if (typeof window !== 'undefined') {
  subscribeAccountsChanged(({ removedUsername }) => {
    if (!removedUsername) return;
    logoutFromStartedWorkers(removedUsername).catch((error: unknown) => {
      logger.error(error, 'Failed to lock the safe storage keys of %s after another tab removed it', removedUsername);
    });
  });
}
