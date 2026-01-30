import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TTransactionPackType, IOnlineSignatureProvider } from '@hiveio/wax';
import KeychainProvider from '@hiveio/wax-signers-keychain';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
const logger = getLogger('app');

// See https://github.com/hive-keychain/hive-keychain-extension/blob/master/documentation/README.md#requestsignbuffer

declare global {
  interface Window {
    hive_keychain: {
      requestSignBuffer: (username: string, message: string, keyType: string, callback: (response: { error?: unknown; result: string }) => void) => void;
    };
  }
}

export const hasCompatibleKeychain = () => typeof window === "object" && typeof window.hive_keychain === "object";

/**
 * Signs challenges (any strings) or Hive transactions with Hive private
 * keys, using [Keychain](https://hive-keychain.com/).
 *
 * @export
 * @class SignerKeychain
 * @extends {Signer}
 */
export class SignerKeychain extends Signer {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.LEGACY) {
    super(signerOptions, pack);
  }

  async destroy(): Promise<void> {}

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.info('in SignerKeychain.signChallenge %o', { message, username, keyType });
    try {
      if (!KeychainProvider.isExtensionInstalled())
        throw new Error('Hive Keychain extension is not installed');

      // Very important: We are using requestSignBuffer instead of encryptData here as it is bugged - chooses invalid keys on Keychain-side
      const msg = typeof message === "string" ? message : JSON.stringify({type:"Buffer", data: Array.from(new Uint8Array(message as ArrayBuffer))});
      const response = await new Promise<string>((resolve, reject) => window.hive_keychain.requestSignBuffer(this.username, msg, this.keyType, (response: { error?: unknown; result: string}) => {
        if (response.error)
          reject(response);
        else
          resolve(response.result);
      }));
      const signature = response;

      logger.info({ signature }, 'keychain');
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);

      const provider: IOnlineSignatureProvider = KeychainProvider.for(
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
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error({ error }, 'SignerKeychain.signTransaction error');
      throw error;
    }
  }
}
