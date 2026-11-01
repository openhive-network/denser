import { EncryptMemo, SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { TRole, TTransactionPackType } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
import { getChain } from '@transaction/lib/chain';
import { verifyAuthorityOrThrow } from '@smart-signer/lib/signer/verify-authority';
import MetaMaskProvider, { defaultSnapOrigin } from '@hiveio/wax-signers-metamask';
import { getSnapsProvider } from '@hiveio/wax-signers-metamask/dist/provider.js';
import env from '@beam-australia/react-env';
import { ensureSnapVersion, requiredSnapVersion, SnapInstallation } from '@smart-signer/lib/metamask-snap-version';
const logger = getLogger('app');

interface ConnectedSnap {
  provider: MetaMaskProvider;
  snapVersion: string;
}

type InstalledSnaps = Record<string, { version?: string } | undefined>;

const isInstalledSnaps = (value: unknown): value is InstalledSnaps => typeof value === 'object' && value !== null;

/** `MetaMaskProvider` keeps the installed snap to itself, so its version is read with `wallet_getSnaps`. */
async function getInstalledSnapVersion(snapOrigin: string): Promise<string | undefined> {
  const snapsProvider = await getSnapsProvider();
  if (!snapsProvider) return undefined;
  const snaps = await snapsProvider.request({ method: 'wallet_getSnaps' });
  return isInstalledSnaps(snaps) ? snaps[snapOrigin]?.version : undefined;
}

const createSnapInstallation = (provider: MetaMaskProvider, snapOrigin: string): SnapInstallation => ({
  getInstalledVersion: () => getInstalledSnapVersion(snapOrigin),
  install: (version) => provider.installSnap(version)
});

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

  /**
   * Installs the snap when missing, and asks MetaMask to update an installed one older than the
   * deployment's `METAMASK_SNAP_VERSION` (or the default): MetaMask keeps an installed snap as it is
   * until `wallet_requestSnaps` asks for a version it doesn't satisfy.
   */
  private async connectProvider(role: TRole): Promise<ConnectedSnap> {
    const snapOrigin = env('METAMASK_SNAP_LOCATION') || defaultSnapOrigin;
    const provider = await MetaMaskProvider.for(
      0, // Explicitly always use first MetaMask account
      role,
      snapOrigin
    );
    const snapVersion = await ensureSnapVersion(
      createSnapInstallation(provider, snapOrigin),
      requiredSnapVersion(env('METAMASK_SNAP_VERSION'))
    );
    return { provider, snapVersion };
  }

  async signChallenge({ message }: SignChallenge): Promise<string> {
    const { username, keyType } = this;
    logger.debug('in SignerMetaMask.signChallenge %o', { message, username, keyType });
    try {
      const { provider } = await this.connectProvider(keyType);

      const key = await provider.getPublicKey(keyType);

      const signature = await provider.encryptData(message, key);

      logger.debug('metamask signature: %s', signature);
      return signature;
    } catch (error) {
      throw error;
    }
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    try {
      const authTx = (await getChain()).createTransactionFromProto(transaction);

      const { provider } = await this.connectProvider(requiredKeyType ?? this.keyType);

      await provider.signTransaction(authTx);

      await verifyAuthorityOrThrow(authTx.toApiJson(), TTransactionPackType.HF_26, this.keyType, 'MetaMask');
      logger.debug('authTx.transaction.signatures: %o', authTx.transaction.signatures);
      return authTx.transaction.signatures[0];
    } catch (error) {
      logger.error('SignerMetaMask.signTransaction error: %s', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * `MetaMaskProvider` forwards the buffer to the snap untouched, so the `#` marker and, for a snap
   * before 1.8.0, its memo byte layout are handled by `memo-crypto`'s wrappers. Imported on the call:
   * this module is in the sign-in bundle, and `memo-crypto` would bring its Beekeeper loaders along.
   */
  async encryptData({ toAccountMemoPublicKey, memo }: EncryptMemo): Promise<string> {
    const [{ provider, snapVersion }, { encryptMemoWithSnap }] = await Promise.all([
      this.connectProvider('memo'),
      import('@smart-signer/lib/memo-crypto')
    ]);
    return encryptMemoWithSnap(provider, snapVersion, toAccountMemoPublicKey, memo);
  }

  async decryptData(encodedMemo: string): Promise<string> {
    const [{ provider, snapVersion }, { decryptMemoWithSnap }] = await Promise.all([
      this.connectProvider('memo'),
      import('@smart-signer/lib/memo-crypto')
    ]);
    return decryptMemoWithSnap(provider, snapVersion, encodedMemo);
  }
}
