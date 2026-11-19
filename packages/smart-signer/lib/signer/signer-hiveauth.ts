import {
  BroadcastingSigner,
  SignChallenge,
  Signer,
  SignTransaction,
  SignerOptions
} from '@smart-signer/lib/signer/signer';
import { StorageMixin } from '@smart-signer/lib/storage-mixin';
import { TTransactionPackType, type transaction } from '@hiveio/wax';
import { getChain } from '@transaction/lib/chain';
import { MissingAuthorityError } from '@transaction/lib/missing-authority';
import { HiveAuthDialogModalPromise } from '@smart-signer/components/hiveauth-dialog';
import type { HiveAuthKeyType, HiveAuthSignIn } from '@smart-signer/lib/hiveauth/channel';
import { HiveAuthError } from '@smart-signer/lib/hiveauth/hiveauth-error';
import { HiveAuthPrompt, type HiveAuthPromptPurpose } from '@smart-signer/lib/hiveauth/prompt';
import { getHiveAuthChannel } from '@smart-signer/lib/hiveauth/relay';
import {
  clearHiveAuthSession,
  readHiveAuthSession,
  writeHiveAuthSession,
  type HiveAuthSession
} from '@smart-signer/lib/hiveauth/session';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

function hiveAuthKeyType(keyType: string): HiveAuthKeyType {
  if (keyType === 'posting' || keyType === 'active') return keyType;
  throw new MissingAuthorityError('owner');
}

/** `transaction`'s operations in the Hive API's legacy JSON, which HiveAuth wallet apps take */
async function legacyOperations(transaction: transaction): Promise<unknown[]> {
  const chain = await getChain();
  const legacy: unknown = JSON.parse(chain.createTransactionFromProto(transaction).toLegacyApi());
  const operations = typeof legacy === 'object' && legacy !== null ? Reflect.get(legacy, 'operations') : undefined;
  if (!Array.isArray(operations)) throw new Error('The transaction has no operations to send to HiveAuth');
  return operations;
}

/**
 * Signs with Hive keys that stay in a wallet app on the user's phone, using
 * [HiveAuth](https://hiveauth.com/): every sign-in, challenge and transaction is approved there. The
 * wallet app broadcasts the transactions it signs (`broadcastTransaction`), so `signTransaction` is
 * not offered. The account's HAS session (`hiveAuthData.<user>`) is reused until it expires, then
 * replaced by a new one the user approves.
 *
 * Extends `Signer` directly: HiveAuth has no local key material, so MEMO encrypt/decrypt stay "not
 * supported" (`Signer`'s default).
 *
 * @export
 * @class SignerHiveauth
 * @extends {StorageMixin(Signer)}
 */
export class SignerHiveauth extends StorageMixin(Signer) implements BroadcastingSigner {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.LEGACY) {
    super(signerOptions, pack);
  }

  async destroy() {
    clearHiveAuthSession(this.storage, this.username);
  }

  /**
   * Opens a new HAS session the user approves in the wallet app, which signs `challenge` with the
   * account's key as the login's proof; resolves with that signature. The session is kept for the
   * account's later requests.
   */
  async signIn(challenge: string): Promise<string> {
    return this.withPrompt('sign_in', async (prompt) => (await this.openSession(prompt, challenge)).signature);
  }

  async signTransaction(_arg: SignTransaction): Promise<string> {
    throw new Error('HiveAuth wallet apps broadcast the transactions they sign: use broadcastTransaction');
  }

  async broadcastTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    const keyType = hiveAuthKeyType(requiredKeyType ?? this.keyType);
    const operations = await legacyOperations(transaction);
    return this.withPrompt('sign', async (prompt) => {
      const session = await this.ensureSession(prompt);
      const transactionId = await getHiveAuthChannel().broadcast(session, keyType, operations, {
        signal: prompt.signal,
        onPending: () => prompt.showApprove()
      });
      logger.info('HiveAuth: the wallet app broadcast transaction %s', transactionId || '(id not named)');
      return transactionId;
    });
  }

  async signChallenge({ message }: SignChallenge): Promise<string> {
    if (typeof message !== 'string') throw new Error('HiveAuth wallet apps sign text challenges only');
    const keyType = hiveAuthKeyType(this.keyType);
    return this.withPrompt('sign', async (prompt) => {
      const session = await this.ensureSession(prompt);
      return getHiveAuthChannel().signChallenge(session, keyType, message, {
        signal: prompt.signal,
        onPending: () => prompt.showApprove()
      });
    });
  }

  /** The account's HAS session, or a new one the user approves when it has none or it expired */
  private async ensureSession(prompt: HiveAuthPrompt): Promise<HiveAuthSession> {
    const stored = readHiveAuthSession(this.storage, this.username);
    if (stored) return stored;
    logger.info('HiveAuth: no live session for %s, asking for a new one', this.username);
    const { session } = await this.openSession(prompt, `${this.username} HiveAuth session ${new Date().toISOString()}`);
    prompt.showApprove();
    return session;
  }

  private async openSession(prompt: HiveAuthPrompt, challenge: string): Promise<HiveAuthSignIn> {
    const signIn = await getHiveAuthChannel().authenticate(this.username, hiveAuthKeyType(this.keyType), challenge, {
      signal: prompt.signal,
      onAuthUri: (uri) => prompt.showAuthUri(uri)
    });
    writeHiveAuthSession(this.storage, signIn.session);
    return signIn;
  }

  /** Runs `request` with the HiveAuth dialog open; a HiveAuth failure stays shown there until closed. */
  private async withPrompt<T>(purpose: HiveAuthPromptPurpose, request: (prompt: HiveAuthPrompt) => Promise<T>): Promise<T> {
    const prompt = new HiveAuthPrompt(purpose);
    HiveAuthDialogModalPromise({ isOpen: true, prompt }).catch((error: unknown) =>
      logger.error(error, 'The HiveAuth dialog failed')
    );
    try {
      const result = await request(prompt);
      prompt.close();
      return result;
    } catch (error) {
      if (error instanceof HiveAuthError) prompt.fail(error.failure);
      else prompt.close();
      throw error;
    }
  }
}
