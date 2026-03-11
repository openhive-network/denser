import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TTransactionPackType, IOnlineSignatureProvider } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
const logger = getLogger('app');

declare global {
  interface Window {
    peakvault: any;
  }
}

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
      const provider = PeakVaultProvider.for(this.username, keyType);

      const signature = provider.encryptData(message, username);

      logger.info('peakvault', { signature });
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);

      const provider: IOnlineSignatureProvider = PeakVaultProvider.for(
        this.username,
        requiredKeyType ?? this.keyType
      );
      await provider.signTransaction(authTx);

      await verifyAuthorityOrThrow(authTx.toApiJson(), TTransactionPackType.LEGACY, this.keyType, 'Peakvault');
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerPeakvault.signTransaction error: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}
