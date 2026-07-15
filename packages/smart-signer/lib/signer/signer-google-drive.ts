import { SignChallenge, Signer, SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { THiveRoles, TTransactionPackType } from '@hiveio/wax';
import { IExternalWalletContent } from '@hiveio/wax-signers-external';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import { googleDriveWalletManager } from '@smart-signer/lib/google-drive-wallet-manager';

export { hasCompatibleGoogleDriveProvider } from '@smart-signer/lib/google-drive-wallet-manager';

const logger = getLogger('app');

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Google Drive](https://gitlab.syncad.com/hive/wax/-/blob/develop/examples/ts/signers-external/README.md).
 *
 * Delegates OAuth, token management and wallet lifecycle to
 * {@link googleDriveWalletManager}. This class only handles signing
 * and per-keyType content caching.
 *
 * @export
 * @class SignerGoogleDrive
 * @extends {Signer}
 */
export class SignerGoogleDrive extends Signer {
  constructor(signerOptions: SignerOptions) {
    super(signerOptions, TTransactionPackType.HF_26);
  }

  private walletContentCache?: Promise<IExternalWalletContent>;
  private currentKeyType?: keyof THiveRoles;

  private getWalletContent(
    username: string,
    keyType: keyof THiveRoles,
    forceLogin = false
  ): Promise<IExternalWalletContent> {
    if (forceLogin || (this.currentKeyType && keyType !== this.currentKeyType)) {
      this.walletContentCache = undefined;
    }

    if (this.walletContentCache) return this.walletContentCache;

    this.walletContentCache = googleDriveWalletManager.loadWalletForKey(username, keyType, forceLogin);
    this.currentKeyType = keyType;

    return this.walletContentCache;
  }

  async destroy(): Promise<void> {
    this.walletContentCache = undefined;
    this.currentKeyType = undefined;
    await googleDriveWalletManager.resetAuth();
    // Note: encryption key WIF is NOT cleared here.
    // The WIF alone cannot access the wallet without the Google OAuth token.
  }

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.info('in SignerGoogleDrive.signChallenge %o', { message, username, keyType });

    let provider: IExternalWalletContent;
    try {
      provider = await this.getWalletContent(username, keyType);
    } catch (walletError) {
      logger.error('Error obtaining Google Drive wallet: %s Retrying with forceLogin=true',
        walletError instanceof Error ? walletError.message : String(walletError));
      provider = await this.getWalletContent(username, keyType, true);
    }

    let publicKey: string | null = null;
    for (const key of provider.enumStoredHiveKeys(username, keyType)) {
      publicKey = key.publicKey;
      break;
    }
    if (!publicKey) {
      const { GoogleDriveErrorDialogPromise } = await import('@smart-signer/components/google-drive-error-dialog');
      await GoogleDriveErrorDialogPromise({
        isOpen: true,
        errorType: 'key_not_found',
        username,
        keyType
      });
      throw new Error(`No stored Hive ${keyType} key found for user ${username} in Google Drive wallet`);
    }

    if (typeof message !== 'string')
      message = await crypto.subtle.digest('SHA-256', new Uint8Array(message as ArrayBuffer));

    const signature = await provider.encryptData(message, publicKey);
    logger.info('google', { signature });
    return signature;
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);
      const effectiveKeyType = requiredKeyType ?? this.keyType;

      let provider: IExternalWalletContent;
      try {
        provider = await this.getWalletContent(this.username, effectiveKeyType);
      } catch (walletError) {
        logger.error('Error obtaining Google Drive wallet: %s Retrying with forceLogin=true',
          walletError instanceof Error ? walletError.message : String(walletError));
        provider = await this.getWalletContent(this.username, effectiveKeyType, true);
      }

      await provider.signTransaction(authTx);
      await verifyAuthorityOrThrow(authTx.toApiJson(), TTransactionPackType.HF_26, this.keyType, 'Google Drive');
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (signError) {
      logger.error('SignerGoogleDrive.signTransaction error: %s',
        signError instanceof Error ? signError.message : String(signError));
      throw signError;
    }
  }
}
