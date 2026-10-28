import { TTransactionPackType } from '@hiveio/wax';
import { getChain } from '@transaction/lib/chain';
import { SignChallenge, SignTransaction, Signer, SignerOptions } from '@smart-signer/lib/signer/signer';
import { forgetPasskeyBinding, passkeyBindingOf } from '@smart-signer/lib/passkey/passkey-binding';
import { openSignerPopup, SignerError, type SignerPopup } from '@smart-signer/lib/passkey/signer-client';

/** What a failed signature says in the toast of the operation it was for. */
const FAILURE_MESSAGES: Record<string, string> = {
  popup_blocked: 'The browser blocked the passkey signer window. Allow pop-ups for this site and try again.',
  signer_unavailable: 'The passkey signer did not answer. Check your connection and try again.',
  key_not_found: "The passkey signer does not hold this account's posting key.",
  prf_unsupported: 'This passkey or browser cannot derive keys (no PRF support).',
  webauthn_unavailable: 'Passkeys are not available in this browser.',
  busy: 'The passkey signer window is busy with another request. Close it and try again.'
};

/**
 * A `SignerError` the operation's error handling can show: a closed popup reads as the user
 * cancelling (no toast), every other code as its message.
 */
function failure(error: unknown): unknown {
  if (!(error instanceof SignerError)) return error;
  if (error.code === 'cancelled') return new SignerError('cancelled', 'user cancelled the passkey signer');
  const message = FAILURE_MESSAGES[error.code] ?? `The passkey signer failed (${error.code}).`;
  return new SignerError(error.code, message);
}

/**
 * Signs Hive transactions in a passkey signer (hive-passkey-signer): the account's posting key is
 * derived there from a passkey and never reaches this page. The signer and the key are the ones
 * the sign-in matched against the account's posting authority (`passkeyBindingOf`). Posting
 * authority only; an operation that needs another key is refused.
 *
 * @export
 * @class SignerPasskey
 * @extends {Signer}
 */
export class SignerPasskey extends Signer {
  constructor(signerOptions: SignerOptions) {
    super(signerOptions, TTransactionPackType.HF_26);
  }

  async destroy(): Promise<void> {
    forgetPasskeyBinding(this.username);
  }

  async signChallenge(_arg: SignChallenge): Promise<string> {
    throw new Error('The passkey signer signs transactions only');
  }

  async signTransaction({ transaction, requiredKeyType }: SignTransaction): Promise<string> {
    if (requiredKeyType && requiredKeyType !== 'posting') {
      throw new Error(`The passkey signer signs with the posting key only; this operation needs the ${requiredKeyType} key.`);
    }
    const binding = passkeyBindingOf(this.username);
    if (!binding) throw new Error(`No passkey signer is known for @${this.username}. Sign in again.`);
    let popup: SignerPopup | undefined;
    try {
      // Opened before anything is awaited: the click that asked for the signature allows the popup.
      popup = openSignerPopup(binding.origin);
      const chain = await getChain();
      const apiTransaction = chain.createTransactionFromProto(transaction).toApiJson();
      const { signatures } = await popup.call('signTransaction', {
        transaction: { ...apiTransaction },
        chainId: chain.chainId,
        publicKey: binding.publicKey
      });
      const [signature] = signatures;
      if (!signature) throw new SignerError('internal', 'the signer returned no signature');
      return signature;
    } catch (error) {
      throw failure(error);
    } finally {
      popup?.close();
    }
  }
}
