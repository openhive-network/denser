import { SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { TTransactionPackType, THexString, transaction } from '@hiveio/wax';
import { PasswordFormMode, PasswordFormOptions, type RememberKey } from '@smart-signer/components/password-form';

import { getLogger } from '@hive/ui/lib/logging';
import { isUserCancelled } from '@hive/ui/lib/user-cancelled';
import { KeyAuthorityType } from '@hiveio/hb-auth';
import { getChain } from '@hive/common-hiveio-packages';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import { parseStoredWif, wifCredentialKey } from '@smart-signer/lib/signer/credential-storage';
import { getTabWif, rememberTabWif } from '@smart-signer/lib/signer/tab-credentials';
import { notifyPlaintextKeyUsed, requestSafeStorageSession } from '@smart-signer/lib/signer/key-protection-signals';
import { signDigestWithWif, warmEphemeralBeekeeper } from '@smart-signer/lib/ephemeral-beekeeper';
import { MissingAuthorityError } from '@transaction/lib/missing-authority';
import { SignedOutError } from '@transaction/lib/signed-out';
import { KeyType } from '@smart-signer/types/common';
import { findSharedKeyTypes } from '@smart-signer/lib/auth/shared-key-types';
import { notifySafeStorageKeysChanged } from '@smart-signer/lib/signer/safe-storage-keys';
import { askWhileSignedIn, askWhileSignedInIfSo, requireStillSignedInAs } from '@smart-signer/lib/signer/signed-in-check';
import { OperationSummary, summarizeOperations } from '@smart-signer/lib/signer/operation-summary';

const logger = getLogger('app');

/**
 * Signs challenges (any strings or byte arrays) or Hive transactions
 * with Hive private keys.
 *
 * Signs in a Beekeeper wallet of its own that lives for one signature (see
 * `ephemeral-beekeeper`), not in hb-auth's instance: that one locks after the
 * safe-storage lock time, which a WIF session that keeps no key there must not.
 *
 * @export
 * @class SignerWif
 * @extends {SignerHbauth}
 */
export class SignerWif extends SignerHbauth {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.HF_26) {
    super(signerOptions, pack);
    // Created to sign: the load overlaps the rest of the action, or the user entering the key
    warmEphemeralBeekeeper();
  }

  override async signTransaction({ digest, transaction, singleSignKeyType, requiredKeyType }: SignTransaction): Promise<string> {
    const signingKeyType = !singleSignKeyType && requiredKeyType ? requiredKeyType : this.keyType;
    const wax = await getChain();
    const txBuilder = wax.createTransactionFromProto(transaction);
    if (digest !== txBuilder.sigDigest) {
      throw new Error('Digests do not match');
    }

    const operation = summarizeOperations(transaction.operations);
    const otherKey = signingKeyType === this.keyType ? null : await this.getOtherKey(signingKeyType, operation);
    const signature = otherKey
      ? await signDigestWithWif(digest, otherKey.wif)
      : await this.signDigest(digest, '', singleSignKeyType, requiredKeyType, operation);
    txBuilder.addSignature(signature);

    await verifyAuthorityOrThrow(txBuilder.toApiJson(), this.pack, signingKeyType, 'WIF');
    // Kept only once the node's authority check took it as the key it was asked for, and for a user
    // still signed in: the check awaited the node, during which the user may have signed out
    if (otherKey?.rememberKey) {
      requireStillSignedInAs(this.username);
      await this.rememberKey(signingKeyType, otherKey.wif, otherKey.rememberKey, operation);
    }

    return signature;
  }

  /**
   * The WIF key of `keyType`, another than the session's: the remembered one, or, for the active key,
   * the one the user enters for `operation`, stated in the prompt, with how long to remember it. An operation
   * needing another key the session lacks is refused instead of letting the node reject it.
   *
   * @throws {MissingAuthorityError} when no key of `keyType` is remembered and it is not the active key
   * @throws {SignedOutError} when the user signed out, or switched account, while asked for the key
   */
  private async getOtherKey(
    keyType: KeyAuthorityType,
    operation?: OperationSummary
  ): Promise<{ wif: string; rememberKey: RememberKey }> {
    const storedWif = this.getStoredWif(keyType);
    if (storedWif) return { wif: storedWif, rememberKey: '' };
    if (keyType !== 'active') throw new MissingAuthorityError(keyType);
    const { username } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.WIF,
      showRememberKey: true,
      keyAuthority: { username, keyType: KeyType.active },
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'login_form.private_key_placeholder',
        title: 'login_form.enter_key_title_active',
        description: 'login_form.this_operation_requires_your_key_for_single_sign_active'
      },
      i18nValues: { keyType },
      operation
    };
    const { password: wif, rememberKey = '' } = await askWhileSignedIn(username, () =>
      this.getKeyFromUser(passwordFormOptions)
    );
    return { wif, rememberKey };
  }

  /**
   * Keeps `wif`, the `keyType` key, as the user chose in the prompt: in this tab's memory, also as
   * the key of every other key type it is the key of, so operations needing those sign without
   * asking until a reload. On this device, it is then imported into safe storage too, in the
   * background, and the session asked to sign in through it.
   */
  private async rememberKey(
    keyType: KeyAuthorityType,
    wif: string,
    rememberKey: Exclude<RememberKey, ''>,
    operation?: OperationSummary
  ): Promise<void> {
    const keyTypes = [keyType, ...(await findSharedKeyTypes(this.username, keyType, wif))];
    rememberTabWif(this.username, keyTypes, wif);
    notifySafeStorageKeysChanged();
    if (rememberKey === 'device') void this.importIntoSafeStorage(keyTypes, wif, operation);
  }

  /**
   * Asks for the safe storage password and imports `wif`, the key of `keyTypes`, into safe storage,
   * with the session's own key when this tab remembers it, then asks for the session to sign in
   * through it. A closed prompt or a failed import leaves the keys remembered for this tab only; a
   * failure is reported to the user.
   */
  private async importIntoSafeStorage(keyTypes: KeyAuthorityType[], wif: string, operation?: OperationSummary) {
    const { username, keyType: sessionKeyType } = this;
    try {
      const { importWithSafeStoragePassword } = await import('@smart-signer/lib/signer/safe-storage-import-prompt');
      const keys = keyTypes.map((keyType) => ({ keyType, wif }));
      const sessionWif = getTabWif(username, sessionKeyType);
      if (sessionWif && !keyTypes.includes(sessionKeyType)) keys.push({ keyType: sessionKeyType, wif: sessionWif });
      if (await importWithSafeStoragePassword(username, keys, operation)) requestSafeStorageSession(username);
    } catch (error) {
      if (error instanceof SignedOutError) return;
      logger.error(error, 'The key of %s was not imported into safe storage; it is remembered for this tab', username);
      const { handleError } = await import('@ui/lib/handle-error');
      handleError(error, { method: 'importIntoSafeStorage', params: { username } });
    }
  }

  override async signDigest(
    digest: THexString,
    explicitPassword: string = '',
    _singleSignKeyType?: KeyAuthorityType,
    _requiredKeyType?: KeyAuthorityType,
    operation?: OperationSummary
  ) {
    const { username, keyType } = this;
    logger.debug('signDigest #wif args: %o', { digest, username, keyType });

    const validKeyTypes = ['posting', 'active', 'owner'];
    if (!validKeyTypes.includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    try {
      let wif = explicitPassword;

      const keyFromStorage = this.getStoredWif(keyType);
      if (keyFromStorage)
        wif = keyFromStorage;

      if (!wif)
        wif = await this.getPasswordFromUser(operation);

      if (!wif)
        throw new Error("Failed to parse private key from storage");

      return await signDigestWithWif(digest, wif);
    } catch (error) {
      logger.error('Error in single sign: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Displays dialog and asks user to enter password (WIF key), and
   * remembers it as the user chose there. Asked of a signed-in user,
   * rejects with `SignedOutError`, remembering nothing, when the user
   * signed out or switched account while asked.
   *
   * @returns {Promise<string>}
   * @memberof SignerWif
   */
  async getPasswordFromUser(operation?: OperationSummary): Promise<string> {
    const { username, keyType } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.WIF,
      showRememberKey: true,
      keyAuthority: { username, keyType },
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'login_form.private_key_placeholder',
        title: `login_form.enter_key_title_${keyType}`,
        description: `login_form.this_operation_requires_your_key_for_single_sign_${keyType}`
      },
      i18nValues: { keyType },
      operation
    };

    try {
      if (!this.passwordPromise) {
        const resolvePassword = async () => {
          // Kept only for a user still signed in: one signing out in another tab while asked would
          // have the key remembered for the signed-out account
          const { password: wif, rememberKey } = await askWhileSignedInIfSo(username, () =>
            this.getKeyFromUser(passwordFormOptions)
          );
          if (rememberKey) await this.rememberKey(keyType, wif, rememberKey, operation);
          return wif;
        };
        this.passwordPromise = resolvePassword();
      }
      const wif: string = await this.passwordPromise;
      return wif;
    } catch (error) {
      if (error instanceof SignedOutError || isUserCancelled(error)) throw error;
      logger.error('Error in getPasswordFromUser: %s', error instanceof Error ? error.message : String(error));
      throw new Error('No WIF key from user');
    }
  }

  /**
   * The WIF key of `keyType` remembered for this account: in this tab, else stored in plaintext by
   * an earlier version, which still signs until the user moves it into safe storage, as they are
   * asked to. '' when there is none.
   */
  private getStoredWif(keyType: string): string {
    const tabWif = getTabWif(this.username, keyType);
    if (tabWif) return tabWif;
    const plaintextWif = parseStoredWif(window.localStorage.getItem(wifCredentialKey(this.username, keyType)));
    if (!plaintextWif) return '';
    notifyPlaintextKeyUsed(this.username);
    return plaintextWif;
  }
}
