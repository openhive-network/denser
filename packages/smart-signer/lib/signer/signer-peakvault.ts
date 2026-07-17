import { EncryptMemo, SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
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

  /**
   * Unlike Keychain, Peak Vault's own `PeakVaultProvider.encryptData` has no
   * known casing bug to route around, so this calls it directly with the
   * `'memo'` role.
   *
   * Note: whether the leading `#` marker convention (strip before encrypt,
   * re-prepend after decrypt - see `memo-crypto.ts`) is followed depends on
   * the real Peak Vault browser extension's internal behavior, which isn't
   * independently verifiable from this codebase (only the `wax-signers-peakvault`
   * wrapper is inspectable, and it does no marker adjustment of its own beyond
   * ensuring the wire buffer has a `#` prefix before the extension call).
   * Assumed to follow the same hive-js convention every other Hive wallet
   * does; flag for review if a real #-prefixed round-trip through Peak Vault
   * doesn't match Keychain's behavior.
   */
  async encryptData({ toAccountMemoPublicKey, memo }: EncryptMemo): Promise<string> {
    const provider = PeakVaultProvider.for(this.username, 'memo');
    return provider.encryptData(memo, toAccountMemoPublicKey);
  }

  async decryptData(encodedMemo: string): Promise<string> {
    const provider = PeakVaultProvider.for(this.username, 'memo');
    return provider.decryptData(encodedMemo);
  }
}
