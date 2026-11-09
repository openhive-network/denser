import { parseAuthError } from '@smart-signer/lib/auth-error';
import { authenticateStoredKey } from '@smart-signer/lib/auth/safe-storage-unlock';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { getLogger } from '@ui/lib/logging';
import type { LiteKeyRole, StoredLiteIdentity } from './lite-identity-record';
import { liteWalletUsername, type LiteWallet } from './lite-wallet';
import { LiteWalletUnlockError } from './lite-wallet-errors';

// Safe Storage in the browser for the lite key store: hb-auth's worker, loaded with this module,
// which the lite flows import only for a Safe Storage identity or when a Safe Storage dialog opens.

const logger = getLogger('app');

/** hb-auth's offline client of the lite entries. */
export const liteWalletClient = () => hbauthService.getLiteWalletClient();

/** The passkey asks for user verification for the owner key only, as the Hive sign-in does for active. */
const userVerification = (keyType: LiteKeyRole): UserVerificationRequirement =>
  keyType === 'posting' ? 'discouraged' : 'required';

/** Unlocks `username` with its passkey where it has one; false when it has none or the ceremony failed. */
async function biometricUnlock(username: string, keyType: LiteKeyRole): Promise<boolean> {
  const client = await liteWalletClient();
  if (!(await client.hasPasskey(username))) return false;
  try {
    await client.biometricUnlock(username, keyType, userVerification(keyType));
    return true;
  } catch (error) {
    logger.info('Lite wallet passkey unlock failed, asking for the password: %s', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/** The password of `identity`'s entry, asked in smart-signer's password dialog; rejects when cancelled. */
async function askPassword(identity: StoredLiteIdentity, keyType: LiteKeyRole): Promise<string> {
  const [{ PasswordDialogModalPromise }, { PasswordFormMode }] = await Promise.all([
    import('@smart-signer/components/password-dialog'),
    import('@smart-signer/components/password-form')
  ]);
  try {
    const { password }: { password: string } = await PasswordDialogModalPromise({
      isOpen: true,
      passwordFormOptions: {
        mode: PasswordFormMode.HBAUTH,
        showInputStorePassword: false,
        showSessionTime: true,
        i18nKeysForCaptions: {
          title: 'login_form.title_hbauth_dialog_password',
          inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
          submitButtonName: 'login_form.title_action_unlock_key'
        },
        i18nValues: { username: identity.name, keyType }
      }
    });
    return password;
  } catch (error) {
    throw new LiteWalletUnlockError('unlock cancelled', true, { cause: error });
  }
}

/**
 * The unlock step of a locked entry: the passkey where one is registered, else (or when it fails)
 * the password. Rejects with `LiteWalletUnlockError` when the guest cancels or hb-auth refuses.
 */
async function unlockLiteWallet(identity: StoredLiteIdentity, keyType: LiteKeyRole): Promise<void> {
  const username = liteWalletUsername(identity);
  if (await biometricUnlock(username, keyType)) return;
  const password = await askPassword(identity, keyType);
  try {
    await authenticateStoredKey(await liteWalletClient(), username, password, keyType);
  } catch (error) {
    throw new LiteWalletUnlockError(parseAuthError(error).message, false, { cause: error });
  }
}

export const browserLiteWallet: LiteWallet = { client: liteWalletClient, unlock: unlockLiteWallet };
