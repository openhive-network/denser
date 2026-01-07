import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TTransactionPackType, IOnlineSignatureProvider } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
const logger = getLogger('app');

export const hasCompatiblePeakvault = () => PeakVaultProvider.isExtensionInstalled();

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Peakvault](https://vault.peakd.com/).
 *
 * @export
 * @class SignerPeakvault
 * @extends {Signer}
 */
export class SignerPeakvault extends Signer {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.LEGACY) {
    super(signerOptions, pack);
  }

  async destroy(): Promise<void> {}

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.info('in SignerPeakvault.signChallenge %o', { message, username, keyType });
    try {
      const provider = PeakVaultProvider.for(
        this.username,
        keyType
      );

      const signature = provider.encryptData(typeof message === "string" ? message : JSON.stringify(message), username);

      logger.info('peakvault', { signature });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = await (await getChain()).createTransaction();

      transaction.operations.forEach((op) => authTx.pushOperation(op));

      const provider: IOnlineSignatureProvider = PeakVaultProvider.for(
        this.username,
        requiredKeyType ?? this.keyType
      );
      await provider.signTransaction(authTx);

      // This is quicker way to verify authority, isntead of
      // authority-checker.ts
      // we will use only this method to verify authority soon
      await (
        await getChain()
      ).api.database_api.verify_authority({
        trx: authTx.toApiJson(),
        pack: TTransactionPackType.LEGACY
      });
      console.log('authTx.transaction.signatures', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerPeakvault.signTransaction error: %o', error);
      throw error;
    }
  }
}
