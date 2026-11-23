import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { withPromptedCheck, type CheckPrompt } from '@smart-signer/lib/signer/active-check';

/** Opens the check prompt for turning the check on or off; rejects with 'No password from user' when dismissed */
async function askChangeCheck(prompt: CheckPrompt, requireActiveCheck: boolean): Promise<void> {
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
          title: requireActiveCheck ? 'active_check.turn_on_title' : 'active_check.turn_off_title',
          description: 'active_check.change_description',
          inputPasswordPlaceholder: 'login_form.password_hbauth_placeholder',
          submitButtonName: 'password_form.active_check_submit'
        }
      }
    });
  } catch (error) {
    throw new Error('No password from user', { cause: error });
  }
}

/**
 * Turns on or off, for `username`'s safe-storage wallet, the check before every operation that needs
 * its active or owner key, once the user gave the password or a passkey in a prompt. Signers read
 * the setting at each signature, so it applies at once, in every tab.
 *
 * @throws {Error} 'No password from user' when the user closed the prompt
 */
export async function changeActiveCheck(username: string, requireActiveCheck: boolean): Promise<void> {
  await hbauthService.withOnlineClient((client) =>
    withPromptedCheck(
      { client, username, ask: (prompt) => askChangeCheck(prompt, requireActiveCheck) },
      (credential) => client.setRequireActiveCheck(username, requireActiveCheck, credential)
    )
  );
}
