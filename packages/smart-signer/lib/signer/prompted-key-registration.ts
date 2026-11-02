import type { KeyAuthorityType } from '@hiveio/hb-auth';
import { findRegistrationKeyRoleHint } from '@smart-signer/lib/validators/key-role-hint';

export interface PromptedKeyRegistration {
  /**
   * The key prompt's `validatePassword`: registers the entered key. Resolves with the key-role hint
   * when hb-auth refuses the key for its authority, keeping the prompt open for another key, else
   * with null, closing it.
   */
  validateKey: (wif: string) => Promise<string | null>;
  /** Throws the error of the registration the prompt closed after, if it failed */
  throwFailure: () => void;
}

/**
 * Registers the `keyType` key entered in a sign-time key prompt from within the prompt, so a key
 * lacking the authority gets the role hint the safe-storage forms show, in place. Any other failure
 * (wrong password, malformed WIF, ...) closes the prompt and is left to `throwFailure`.
 */
export function promptedKeyRegistration(
  keyType: KeyAuthorityType,
  register: (wif: string) => Promise<void>
): PromptedKeyRegistration {
  let failure: { error: unknown } | undefined;
  return {
    async validateKey(wif) {
      try {
        await register(wif);
        return null;
      } catch (error) {
        const keyRoleHint = keyType === 'owner' ? null : findRegistrationKeyRoleHint(error, keyType);
        if (keyRoleHint) return keyRoleHint;
        failure = { error };
        return null;
      }
    },
    throwFailure() {
      if (failure) throw failure.error;
    }
  };
}
