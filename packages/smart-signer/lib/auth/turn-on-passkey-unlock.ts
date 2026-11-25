import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { PasswordFormMode } from '@smart-signer/components/password-form';
import { TurnOnPasskeyUnlockDialogPromise } from '@smart-signer/components/turn-on-passkey-unlock-dialog';
import { classifyUnlockRefusal } from '@smart-signer/lib/wrong-safe-storage-password';
import { SignedOutError } from '@transaction/lib/signed-out';

const WRONG_PASSWORD_KEY = 'broadcast_error.wrong_safe_storage_password';

/** hb-auth refused the password checked, which the prompt says, keeping it open */
class WrongPassword extends Error {}

/**
 * The safe storage password of `username` the user enters, checked without changing the session
 * (hb-auth's `checkCredential`): the passkey unlock keeps the password, so a wrong one would only
 * be found at the next sign-in. Undefined when the user closed the prompt.
 *
 * @throws the check's error, when it failed for another reason than a wrong password
 */
async function askCheckedPassword(username: string): Promise<string | undefined> {
  let failure: { error: unknown } | undefined;
  const validatePassword = async (password: string): Promise<string | null> => {
    try {
      await hbauthService.withOnlineClient(async (client) => {
        try {
          await client.checkCredential(username, { password });
        } catch (error) {
          const refusal = await classifyUnlockRefusal(
            error,
            async () => (await client.getRegisteredUserByUsername(username)) !== null
          );
          if (refusal === 'wrong-password') throw new WrongPassword();
          throw error;
        }
      });
      return null;
    } catch (error) {
      if (error instanceof WrongPassword) return WRONG_PASSWORD_KEY;
      failure = { error };
      return null;
    }
  };
  let entered: { password: string };
  try {
    entered = await PasswordDialogModalPromise({
      isOpen: true,
      passwordFormOptions: {
        mode: PasswordFormMode.HBAUTH,
        validatePassword,
        i18nKeysForCaptions: {
          title: 'passkey_unlock.turn_on_title',
          description: 'passkey_unlock.turn_on_description',
          inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
          submitButtonName: 'passkey_unlock.continue_button'
        }
      }
    });
  } catch (error) {
    if (error instanceof SignedOutError) throw error;
    return undefined;
  }
  if (failure) throw failure.error;
  return entered.password;
}

/**
 * Turns the passkey unlock of `username`'s safe storage on on this device from the account menu:
 * the password, checked, then the offer's own steps. Resolves true once on, false when the user
 * closed either prompt.
 *
 * @throws the password check's error, other than a wrong password
 * @throws {SignedOutError} when the user signed out while asked
 */
export async function turnOnPasskeyUnlock(username: string): Promise<boolean> {
  const password = await askCheckedPassword(username);
  if (password === undefined) return false;
  return TurnOnPasskeyUnlockDialogPromise({ isOpen: true, username, password });
}
