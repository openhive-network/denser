import { EncryptMemo, SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TTransactionPackType, IOnlineSignatureProvider } from '@hiveio/wax';
import KeychainProvider from '@hiveio/wax-signers-keychain';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import { encryptMemoWithKeychain, decryptMemoWithKeychain } from '@smart-signer/lib/signer/keychain-memo-crypto';
const logger = getLogger('app');

// See https://github.com/hive-keychain/hive-keychain-extension/blob/master/documentation/README.md#requestsignbuffer

declare global {
  interface Window {
    hive_keychain: any;
  }
}

/**
 * Checks if Hive Keychain extension is available and compatible.
 * Uses defensive checks to prevent DOM clobbering attacks where user content
 * like `<a id="hive_keychain">` could shadow the extension object.
 */
export const hasCompatibleKeychain = () =>
  typeof window === 'object' &&
  typeof window.hive_keychain === 'object' &&
  window.hive_keychain !== null &&
  typeof window.hive_keychain.requestSignBuffer === 'function';

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
      const provider = KeychainProvider.for(this.username, keyType);

      const signature = provider.encryptData(message, username);

      logger.info('keychain', { signature });
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

      await verifyAuthorityOrThrow(authTx.toApiJson(), TTransactionPackType.LEGACY, this.keyType, 'Keychain');
      logger.info('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerKeychain.signTransaction error: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /** Uses `encryptMemoWithKeychain`'s casing workaround, not a plain `KeychainProvider` call - see its docstring. */
  async encryptData({ toAccount, memo }: EncryptMemo): Promise<string> {
    return encryptMemoWithKeychain(this.username, toAccount, memo);
  }

  /** Decoding isn't affected by the casing bug above - see `decryptMemoWithKeychain` (keychain-memo-crypto.ts). */
  async decryptData(encodedMemo: string): Promise<string> {
    return decryptMemoWithKeychain(this.username, encodedMemo);
  }
}
