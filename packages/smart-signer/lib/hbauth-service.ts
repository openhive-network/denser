import type { OnlineClient, OfflineClient } from '@hiveio/hb-auth';

import {
  getOnlineClient,
  getOfflineClient,
  logoutFromEveryWorker,
  withOnlineClient,
  type OnlineClientOperationOptions
} from "@hive/common-hiveio-packages";

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
