import { SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { TTransactionPackType, THexString, transaction } from '@hiveio/wax';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';

import { getLogger } from '@hive/ui/lib/logging';
import { isUserCancelled } from '@hive/ui/lib/user-cancelled';
import { KeyAuthorityType } from '@hiveio/hb-auth';
import { getChain } from '@hive/common-hiveio-packages';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import { validateKeyAuthority } from '@smart-signer/lib/validators/validate-key-authority';
import { wifCredentialKey } from '@smart-signer/lib/signer/credential-storage';
import { MissingAuthorityError } from '@transaction/lib/missing-authority';
import { SignedOutError } from '@transaction/lib/signed-out';
import { TRANSACTION_EXPIRATION } from '@transaction/lib/transaction-expiration';
import { KeyType } from '@smart-signer/types/common';
import { findSharedKeyTypes } from '@smart-signer/lib/auth/shared-key-types';
import { notifySafeStorageKeysChanged } from '@smart-signer/lib/signer/safe-storage-keys';
import { askWhileSignedIn, askWhileSignedInIfSo, requireStillSignedInAs } from '@smart-signer/lib/signer/signed-in-check';

const logger = getLogger('app');

/**
 * Signs challenges (any strings or byte arrays) or Hive transactions
 * with Hive private keys.
 *
 * As we already have hb-auth, we can just reuse its beekeeper instance
 *
 * @export
 * @class SignerWif
 * @extends {SignerHbauth}
 */
export class SignerWif extends SignerHbauth {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.HF_26) {
    super(signerOptions, pack);
  }

  override async signTransaction({ digest, transaction, singleSignKeyType, requiredKeyType }: SignTransaction): Promise<string> {
    const signingKeyType = !singleSignKeyType && requiredKeyType ? requiredKeyType : this.keyType;
    const wax = await getChain();
    const txBuilder = wax.createTransactionFromProto(transaction);
    if (digest !== txBuilder.sigDigest) {
      throw new Error('Digests do not match');
    }

    const otherKey = signingKeyType === this.keyType ? null : await this.getOtherKey(signingKeyType);
    const signature = otherKey
      ? await (await this.hbAuthClient).singleSign(this.username, digest, otherKey.wif, signingKeyType)
      : await this.signDigest(digest, '', singleSignKeyType, requiredKeyType);
    txBuilder.addSignature(signature);

    await verifyAuthorityOrThrow(txBuilder.toApiJson(), this.pack, signingKeyType, 'WIF');
    // Kept only once the node's authority check took it as the key it was asked for, and for a user
    // still signed in: the check awaited the node, during which the user may have signed out
    if (otherKey?.store) {
      requireStillSignedInAs(this.username);
      this.storeOtherKey(signingKeyType, otherKey.wif);
    }

    return signature;
  }

  /**
   * The WIF key of `keyType`, another than the session's: the stored one, or, for the active key,
   * the one the user enters for this operation, then kept when they ask for it. An operation
   * needing another key the session lacks is refused instead of letting the node reject it.
   *
   * @throws {MissingAuthorityError} when no key of `keyType` is stored and it is not the active key
   * @throws {SignedOutError} when the user signed out, or switched account, while asked for the key
   */
  private async getOtherKey(keyType: KeyAuthorityType): Promise<{ wif: string; store: boolean }> {
    const storedWif = this.getStoredWif(keyType);
    if (storedWif) return { wif: storedWif, store: false };
    if (keyType !== 'active') throw new MissingAuthorityError(keyType);
    const { username } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.WIF,
      showInputStorePassword: true,
      validatePassword: (wif) => validateKeyAuthority(username, KeyType.active, wif),
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'login_form.private_key_placeholder',
        inputStorePasswordLabel: 'password_form.store_key_label',
        title: 'login_form.this_operation_requires_your_key_for_single_sign_active'
      },
      i18nValues: { keyType }
    };
    const { password: wif, storePassword } = await askWhileSignedIn(username, () =>
      this.getKeyFromUser(passwordFormOptions)
    );
    return { wif, store: !!storePassword };
  }

  private storeOtherKey(keyType: KeyAuthorityType, wif: string): void {
    window.localStorage.setItem(wifCredentialKey(this.username, keyType), JSON.stringify(wif));
    notifySafeStorageKeysChanged();
  }

  override async signDigest(
    digest: THexString,
    explicitPassword: string = '',
    _singleSignKeyType?: KeyAuthorityType,
    _requiredKeyType?: KeyAuthorityType
  ) {
    const { username, keyType } = this;
    logger.debug('signDigest #wif args: %o', { digest, username, keyType });

    const validKeyTypes = ['posting', 'active', 'owner'];
    if (!validKeyTypes.includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    const authClient = await this.hbAuthClient;
    if (!validKeyTypes.includes(this.keyType)) {
      throw new Error(`Unsupported singleSignKeyType: ${this.keyType}`);
    }

    try {
      let wif = explicitPassword;

      const keyFromStorage = this.getStoredWif(keyType);
      if (keyFromStorage)
        wif = keyFromStorage;

      if (!wif)
        wif = await this.getPasswordFromUser();

      if (!wif)
        throw new Error("Failed to parse private key from storage");

      const signature = await authClient.singleSign(
        username,
        digest,
        wif,
        this.keyType
      );

      return signature;
    } catch (error) {
      logger.error('Error in single sign: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Displays dialog and asks user to enter password (WIF key). Also
   * triggers storing this password, if user wants this. Asked of a
   * signed-in user, rejects with `SignedOutError`, storing nothing, when
   * the user signed out or switched account while asked.
   *
   * @returns {Promise<string>}
   * @memberof SignerWif
   */
  async getPasswordFromUser(): Promise<string> {
    const { username, keyType } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.WIF,
      showInputStorePassword: true,
      validatePassword: (wif) => validateKeyAuthority(username, keyType, wif),
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: 'login_form.private_key_placeholder',
        inputStorePasswordLabel: 'password_form.store_key_label',
        title: 'login_form.title_wif_dialog_password'
      },
      i18nValues: { keyType }
    };

    try {
      if (!this.passwordPromise) {
        const resolvePassword = async () => {
          // Kept only for a user still signed in: one signing out in another tab while asked would
          // have the key stored for the signed-out account
          const { password: wif, storePassword: storeKey } = await askWhileSignedInIfSo(username, () =>
            this.getKeyFromUser(passwordFormOptions)
          );
          if (storeKey) {
            await this.storePassword(wif);
            await this.storeSharedKey(wif);
          }
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
   * Stores `wif`, just stored as the session's key, as the key of every other key type it is also
   * the key of, so operations needing those sign with it without asking.
   */
  private async storeSharedKey(wif: string): Promise<void> {
    const sharedKeyTypes = await findSharedKeyTypes(this.username, this.keyType, wif);
    if (!sharedKeyTypes.length) return;
    for (const keyType of sharedKeyTypes) {
      window.localStorage.setItem(wifCredentialKey(this.username, keyType), JSON.stringify(wif));
    }
    notifySafeStorageKeysChanged();
  }

  /** The WIF key of `keyType` stored for this account, or '' when none is stored. */
  private getStoredWif(keyType: string): string {
    const stored = window.localStorage.getItem(wifCredentialKey(this.username, keyType));
    return stored ? JSON.parse(stored) : '';
  }

  private get storageKey() {
    return wifCredentialKey(this.username, this.keyType);
  }

  /**
   * Stores password (WIF key) in storage for future use.
   *
   * @param {string} wif
   * @memberof SignerWif
   */
  async storePassword(wif: string) {
    const storageKey = this.storageKey;

    // Check if we have the same key already stored (means also already
    // verified).
    const wifInStorage = window.localStorage.getItem(storageKey);
    if (wifInStorage) {
      logger.info('Found key in storage under key: %s', storageKey);
      if (JSON.parse(wifInStorage) === wif) {
        logger.info('Wif is already stored under key: %s', storageKey);
        return;
      } else {
        logger.info('Stored wif is different');
      }
    } else {
      logger.info('No wif in storage under key: %s', storageKey);
    }

    // Verify key before storing it.
    logger.info('Starting to verify wif');
    let valid = false;
    try {
      const wax = await getChain();

      const tx = await wax.createTransaction(TRANSACTION_EXPIRATION);
      tx.pushOperation({
        custom_json_operation: {
          id: 'test',
          json: '{}',
          required_auths: this.keyType === 'posting' ? [] : [this.username],
          required_posting_auths: this.keyType === 'posting' ? [this.username] : []
        }
      });
      const signature = await this.signDigest(tx.sigDigest, wif);
      tx.addSignature(signature);

      const result = await wax.api.database_api.verify_authority({ pack: this.pack, trx: tx.toApiJson() });

      valid = result.valid;
    } catch (error) {
      logger.error('Cannot verify private key: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Throw error if key is invalid.
    if (!valid) {
      throw new Error('login_form.zod_error.invalid_wif');
    }

    // Store key if it is valid.
    window.localStorage.setItem(storageKey, JSON.stringify(wif));

    logger.info('Stored valid wif under key: %s', storageKey);
  }
}
