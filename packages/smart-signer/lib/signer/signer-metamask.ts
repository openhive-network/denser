import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TTransactionPackType } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import MetaMaskProvider from '@hiveio/wax-signers-metamask';
import env from '@beam-australia/react-env';
const logger = getLogger('app');

export const hasCompatibleMetaMask = () => MetaMaskProvider.isExtensionInstalled();

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [MetaMask](https://metamask.io/).
 *
 * @export
 * @class SignerMetaMask
 * @extends {Signer}
 */
export class SignerMetaMask extends Signer {
  constructor(signerOptions: SignerOptions) {
    super(signerOptions, TTransactionPackType.HF_26);
  }

  async destroy(): Promise<void> {}

  private async ensureMetaMaskSnapInitialized(provider: MetaMaskProvider) {
    if (!provider.isSnapInstalled) {
      await provider.installSnap(env('METAMASK_SNAP_VERSION'));
    }
  }

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.info('in SignerMetaMask.signChallenge %o', { message, username, keyType });
    try {
      const provider = await MetaMaskProvider.for(
        0, // Explicitly always use first MetaMask account
        keyType,
        env('METAMASK_SNAP_LOCATION')
      );

      await this.ensureMetaMaskSnapInitialized(provider);

      const key = await provider.getPublicKey(keyType);

      const signature = await provider.encryptData(message, key);

      logger.info('metamask', { signature });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);

      const provider = await MetaMaskProvider.for(
        0, // Explicitly always use first MetaMask account
        requiredKeyType ?? this.keyType,
        env('METAMASK_SNAP_LOCATION')
      );

      await this.ensureMetaMaskSnapInitialized(provider);

      await provider.signTransaction(authTx);

      // This is quicker way to verify authority, isntead of
      // authority-checker.ts
      // we will use only this method to verify authority soon
      try {
        await (
          await getChain()
        ).api.database_api.verify_authority({
          trx: authTx.toApiJson(),
          pack: TTransactionPackType.HF_26
        });
      } catch (verifyError) {
        logger.error('MetaMask key authority verification failed: %o', verifyError);
        const msg = verifyError instanceof Error ? verifyError.message : String(verifyError);
        if (/unknown key/i.test(msg)) {
          throw new Error('Account not found on the blockchain');
        }
        throw new Error(`The provided key does not have ${this.keyType} authority for this account`);
      }
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerMetaMask.signTransaction error: %o', error);
      throw error;
    }
  }
}
