import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { SignerHbauth } from '@smart-signer/lib/signer/signer-hbauth';
import { TTransactionPackType, THexString, transaction } from '@hiveio/wax';
import { PasswordDialogModalPromise } from '@smart-signer/components/password-dialog';
import { PasswordFormMode, PasswordFormOptions } from '@smart-signer/components/password-form';

import { getLogger } from '@hive/ui/lib/logging';
import { KeyAuthorityType } from '@hiveio/hb-auth';
import { getChain } from '@hive/common-hiveio-packages';

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

  override async signDigest(
    digest: THexString,
    explicitPassword: string = '',
    _singleSignKeyType?: KeyAuthorityType,
    _requiredKeyType?: KeyAuthorityType
  ) {
    const { username, keyType } = this;
    logger.info('signDigest #wif args: %o', { digest, username, keyType });

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

      const keyFromStorage = window.localStorage.getItem(this.storageKey);
      if (keyFromStorage)
        wif = JSON.parse(keyFromStorage);

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
      logger.error('Error in single sign: %o', error);
      throw error;
    }
  }

  /**
   * Displays dialog and asks user to enter password (WIF key). Also
   * triggers storing this password, if user wants this.
   *
   * @returns {Promise<string>}
   * @memberof SignerWif
   */
  async getPasswordFromUser(): Promise<string> {
    const { keyType } = this;
    const passwordFormOptions: PasswordFormOptions = {
      mode: PasswordFormMode.WIF,
      showInputStorePassword: true,
      i18nKeysForCaptions: {
        inputPasswordPlaceholder: `Your ${keyType} private key`,
        inputStorePasswordLabel: 'Store key',
        title: 'Enter your WIF key'
      }
    };

    try {
      if (!this.passwordPromise) {
        const resolvePassword = async () => {
          const { password: wif, storePassword: storeKey } = await PasswordDialogModalPromise({
            isOpen: true,
            passwordFormOptions
          });
          if (storeKey) {
            await this.storePassword(wif);
          }
          return wif;
        };
        this.passwordPromise = resolvePassword();
      }
      const wif: string = await this.passwordPromise;
      return wif;
    } catch (error) {
      logger.error('Error in getPasswordFromUser: %o', error);
      throw new Error('No WIF key from user');
    }
  }

  private get storageKey() {
    return `wif.${this.username}@${this.keyType}`;
  }

  /**
   * Stores password (WIF key) in storage for future use.
   *
   * @param {''} wif
   * @memberof SignerWif
   */
  async storePassword(wif: '') {
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

      const tx = await wax.createTransaction();
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
      logger.error('Cannot verify private key: %o', error);
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
