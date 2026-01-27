import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TTransactionPackType, IOnlineSignatureProvider } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
const logger = getLogger('app');

declare global {
  interface Window {
    peakvault: any;
  }
}

// XXX: Currently we can't make peakvault provider work with Uint8Array buffer signing, so temporarily disable it.
export const hasCompatiblePeakvault = () => false; // PeakVaultProvider.isExtensionInstalled();

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
      // const provider = PeakVaultProvider.for(this.username, keyType);

      if (!PeakVaultProvider.isExtensionInstalled())
        throw new Error('Peak Vault extension is not installed');

      // const signature = provider.encryptData(typeof message === "string" ? message : JSON.stringify(message), username);

      // Temporary fix for the signChallenge method

      const msg = typeof message === "string" ? message : JSON.stringify({type:"Buffer", data: Array.from(new Uint8Array(message as ArrayBuffer))});
      const response = await window.peakvault.requestSignBuffer(this.username, this.keyType, msg);
      const signature = response.result as string;

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
