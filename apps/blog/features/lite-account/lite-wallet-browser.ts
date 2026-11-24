import { parseAuthError } from '@smart-signer/lib/auth-error';
import { authenticateStoredKey } from '@smart-signer/lib/auth/safe-storage-unlock';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { adoptReplacedPasskey, isPasskeyRelink, unlockWithPasskey } from '@smart-signer/lib/passkey-unlock/passkey-unlock';
import { withPromptedCheck, type CheckPrompt } from '@smart-signer/lib/signer/active-check';
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

type BiometricUnlock = { unlocked: true } | { unlocked: false; failure?: unknown };

/** Unlocks `username` with its passkey where it has one; not unlocked, with why, when it has none or the ceremony failed. */
async function biometricUnlock(username: string, keyType: LiteKeyRole): Promise<BiometricUnlock> {
  const client = await liteWalletClient();
  if (!(await client.hasPasskey(username))) return { unlocked: false };
  try {
    await unlockWithPasskey(client, username, keyType, userVerification(keyType));
    return { unlocked: true };
  } catch (failure) {
    logger.info('Lite wallet passkey unlock failed, asking for the password: %s', failure instanceof Error ? failure.message : String(failure));
    return { unlocked: false, failure };
  }
}

/**
 * The password of `identity`'s entry, asked in smart-signer's password dialog, which says where it
 * also links this device to the entry's passkey (`relink`); rejects when cancelled.
 */
async function askPassword(identity: StoredLiteIdentity, keyType: LiteKeyRole, relink: boolean): Promise<string> {
  const [{ PasswordDialogModalPromise }, { PasswordFormMode }] = await Promise.all([
    import('@smart-signer/components/password-dialog'),
    import('@smart-signer/components/password-form')
  ]);
  try {
    const { password }: { password: string } = await PasswordDialogModalPromise({
      isOpen: true,
      passwordFormOptions: {
        mode: PasswordFormMode.HBAUTH,
        showSessionTime: true,
        i18nKeysForCaptions: {
          title: 'login_form.title_hbauth_dialog_password',
          inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
          submitButtonName: 'login_form.title_action_unlock_key',
          ...(relink ? { description: 'login_form.passkey_prompt.relink_hint' } : {})
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
  const biometric = await biometricUnlock(username, keyType);
  if (biometric.unlocked) return;
  const password = await askPassword(identity, keyType, isPasskeyRelink(biometric.failure, username));
  try {
    await authenticateStoredKey(await liteWalletClient(), username, password, keyType);
  } catch (error) {
    const { message, messageKey } = parseAuthError(error);
    throw new LiteWalletUnlockError(message, false, { cause: error, messageKey });
  }
  await adoptReplacedPasskey(biometric.failure, username, password);
}

/** The check before an owner signature of `identity`'s entry, in smart-signer's password dialog; rejects when cancelled */
async function askCheck(identity: StoredLiteIdentity, prompt: CheckPrompt): Promise<void> {
  const [{ PasswordDialogModalPromise }, { PasswordFormMode }] = await Promise.all([
    import('@smart-signer/components/password-dialog'),
    import('@smart-signer/components/password-form')
  ]);
  try {
    await PasswordDialogModalPromise({
      isOpen: true,
      passwordFormOptions: {
        mode: PasswordFormMode.HBAUTH,
        autoComplete: 'one-time-code',
        validatePassword: prompt.validatePassword,
        checkPasskey: prompt.checkPasskey,
        i18nKeysForCaptions: {
          title: 'password_form.active_check_title',
          description: 'password_form.active_check_description',
          inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
          submitButtonName: 'password_form.active_check_submit'
        },
      }
    });
  } catch (error) {
    throw new LiteWalletUnlockError('check cancelled', true, { cause: error });
  }
}

/** `digest` signed with `identity`'s `keyType` key through hb-auth's check, given in a prompt */
async function signLiteWithCheck(identity: StoredLiteIdentity, digest: string, keyType: LiteKeyRole): Promise<string> {
  const client = await liteWalletClient();
  const username = liteWalletUsername(identity);
  return withPromptedCheck({ client, username, ask: (prompt) => askCheck(identity, prompt) }, (credential) =>
    client.signWithCheck(username, digest, keyType, credential)
  );
}

export const browserLiteWallet: LiteWallet = {
  client: liteWalletClient,
  unlock: unlockLiteWallet,
  signWithCheck: signLiteWithCheck
};
