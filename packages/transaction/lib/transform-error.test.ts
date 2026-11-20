import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENERIC_ERROR_TITLE_KEY, summarizeErrorForLog, transformError } from './transform-error';

const SMART_SIGNER_LOCALES_DIR = join(__dirname, '../../smart-signer/locales');

function translate(locale: string, key: string): unknown {
  const translations = JSON.parse(readFileSync(join(SMART_SIGNER_LOCALES_DIR, locale, 'smart-signer.json'), 'utf8'));
  return key.split('.').reduce((node, part) => node?.[part], translations);
}

class WaxKeychainProviderError extends Error {
  name = 'WaxKeychainProviderError';
}

describe('transformError', () => {
  it("shows the Keychain extension's own answer and keeps it reportable, with details", () => {
    const error = new WaxKeychainProviderError('Keychain error: The account is not in your wallet');
    const { errorTitle, fullError, isWellKnownError, keychainFallback } = transformError(error);
    expect(errorTitle).to.equal('The account is not in your wallet');
    expect(fullError).to.equal('WaxKeychainProviderError: Keychain error: The account is not in your wallet');
    expect(isWellKnownError).to.equal(false);
    expect(keychainFallback).to.equal(null);
  });

  for (const message of [
    'An error occured while signing the transaction',
    'An error occurred while signing the transaction.'
  ]) {
    it(`flags Keychain's generic signing failure for the app's own text, keeping it reportable (${message})`, () => {
      const error = new WaxKeychainProviderError(`Keychain error: ${message}`);
      const { fullError, isWellKnownError, keychainFallback } = transformError(error);
      expect(keychainFallback).to.equal('signing_failed');
      expect(fullError).to.equal(`WaxKeychainProviderError: Keychain error: ${message}`);
      expect(isWellKnownError).to.equal(false);
    });
  }

  it('does not flag a Keychain answer that only mentions signing', () => {
    const error = new WaxKeychainProviderError('Keychain error: An error occurred while signing the transaction: key missing');
    expect(transformError(error).keychainFallback).to.equal(null);
  });

  /** What wax's Keychain provider throws: the extension's message flattened, its response kept as the cause */
  function keychainError(response: { error: string; message: string }) {
    return new WaxKeychainProviderError(`Keychain error: ${response.message}`, {
      cause: { success: false, ...response }
    });
  }

  it('keeps a Keychain request dropped for a newer one reportable', () => {
    const error = keychainError({ error: 'ignored', message: 'User ignored this transaction' });
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('User ignored this transaction');
    expect(isWellKnownError).to.equal(false);
  });

  for (const message of [
    'Request was canceled by the user.',
    'Die Anfrage wurde vom Benutzer abgebrochen.',
    'La solicitud fue cancelada por el usuario.',
    '用户已取消请求。'
  ]) {
    it(`keeps a request the user rejected in Keychain quiet, whatever its language (${message})`, () => {
      const { errorTitle, isWellKnownError } = transformError(keychainError({ error: 'user_cancel', message }));
      expect(errorTitle).to.equal(message);
      expect(isWellKnownError).to.equal(true);
    });
  }

  it('keeps a user cancel quiet when the Keychain error is wrapped again', () => {
    const cancel = keychainError({ error: 'user_cancel', message: 'Anulowano.' });
    const { isWellKnownError } = transformError(new Error('Sign-in failed', { cause: cancel }));
    expect(isWellKnownError).to.equal(true);
  });

  it('does not take the English cancel text without the code for a user cancel', () => {
    const error = new WaxKeychainProviderError('Keychain error: Request was canceled by the user.');
    expect(transformError(error).isWellKnownError).to.equal(false);
  });

  /** What Peak Vault rejects a request with: its own response, not an Error */
  function peakVaultRejection(response: { error: string; message?: string }) {
    return { success: false, account: 'guest4test1', ...response };
  }

  it("shows Peak Vault's own answer to a rejected request instead of failing on it", () => {
    const rejection = peakVaultRejection({ error: 'sign_error', message: 'Could not sign the transaction' });
    const { errorTitle, fullError, isWellKnownError } = transformError(rejection);
    expect(errorTitle).to.equal('Could not sign the transaction');
    expect(fullError).to.contain('"error":"sign_error"');
    expect(isWellKnownError).to.equal(false);
  });

  it('keeps a request the user cancelled in Peak Vault quiet', () => {
    const rejection = peakVaultRejection({ error: 'user_cancel', message: 'Request was canceled by the user.' });
    const { errorTitle, isWellKnownError } = transformError(rejection);
    expect(errorTitle).to.equal('Request was canceled by the user.');
    expect(isWellKnownError).to.equal(true);
  });

  it('keeps the generic title for a Peak Vault rejection without a message', () => {
    const { errorTitle, isWellKnownError } = transformError(peakVaultRejection({ error: 'sign_error' }));
    expect(errorTitle).to.equal('Error');
    expect(isWellKnownError).to.equal(false);
  });

  for (const value of [{ status: 500 }, 42, undefined, null]) {
    it(`does not fail on a thrown value that is neither an Error nor a string (${String(value)})`, () => {
      expect(transformError(value).errorTitle).to.equal('Error');
    });
  }

  for (const message of ['undefined', '', '   ']) {
    it(`flags a Keychain error without an answer (${JSON.stringify(message)}) instead of showing it`, () => {
      const error = new WaxKeychainProviderError(`Keychain error: ${message}`);
      const { errorTitle, isWellKnownError, keychainFallback } = transformError(error);
      expect(errorTitle).to.equal('Error');
      expect(isWellKnownError).to.equal(false);
      expect(keychainFallback).to.equal('no_message');
    });
  }

  it('prefers a well-known description over the Keychain answer', () => {
    const error = new Error('Keychain error: Invalid credentials');
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('Invalid credentials');
    expect(isWellKnownError).to.equal(true);
  });

  /** What wax throws for hived's balance assertions: the node's assets interpolated as "[object Object]" */
  class WaxInsufficientBalanceError extends Error {
    name = 'WaxInsufficientBalanceError';
  }

  it('titles a claim of more rewards than the chain holds with the app text, not wax\'s message', () => {
    const error = new WaxInsufficientBalanceError(
      '[Chain Error] Cannot claim that much HIVE. Claim: [object Object] Actual: [object Object]'
    );
    const { errorTitle, isWellKnownError, insufficientBalance } = transformError(error, {
      method: 'claim_reward_balance',
      params: { account: 'alice' }
    });
    expect(insufficientBalance).to.equal('rewards_already_claimed');
    expect(isWellKnownError).to.equal(true);
    expect(errorTitle).not.to.contain('[object Object]');
    expect(errorTitle).not.to.contain('WaxInsufficientBalanceError');
  });

  it('recognises the claim rejection by its text whatever method reported it', () => {
    const error = new Error('Assert Exception:reward_hive <= acnt.reward_hive_balance: Cannot claim that much HBD.');
    expect(transformError(error, { method: 'claimReward', params: {} }).insufficientBalance).to.equal(
      'rewards_already_claimed'
    );
  });

  it('titles a transfer larger than the balance as a balance too low', () => {
    const error = new WaxInsufficientBalanceError(
      '[Chain Error] Account does not have sufficient funds for transfer. Balance: [object Object]'
    );
    const { errorTitle, isWellKnownError, insufficientBalance } = transformError(error, {
      method: 'transfer',
      params: { from: 'alice' }
    });
    expect(insufficientBalance).to.equal('balance_too_low');
    expect(isWellKnownError).to.equal(true);
    expect(errorTitle).not.to.contain('[object Object]');
  });

  /** What wax throws for hived's untagged adjust_balance assertion */
  class WaxAssertionError extends Error {
    name = 'WaxAssertionError';
  }

  const ADJUST_BALANCE_MESSAGE =
    '[Chain Error] Account guest4test1 does not have sufficient funds for balance adjustment. ' +
    'Required: [object Object], Available: [object Object]';

  for (const [ErrorClass, method] of [
    [WaxAssertionError, 'transfer'],
    [WaxAssertionError, 'transfer_to_vesting'],
    [WaxAssertionError, 'transfer_to_savings'],
    [WaxInsufficientBalanceError, 'transfer']
  ] as const) {
    it(`titles hived's adjust_balance rejection on ${method} as a balance too low (${ErrorClass.name})`, () => {
      const { errorTitle, isWellKnownError, insufficientBalance } = transformError(new ErrorClass(ADJUST_BALANCE_MESSAGE), {
        method,
        params: { from: 'guest4test1' }
      });
      expect(insufficientBalance).to.equal('balance_too_low');
      expect(isWellKnownError).to.equal(true);
      expect(errorTitle).to.equal('Error');
    });
  }

  it("titles hived's adjust_balance rejection of a claim as rewards already claimed", () => {
    const error = new WaxAssertionError(ADJUST_BALANCE_MESSAGE);
    expect(transformError(error, { method: 'claim_reward_balance', params: {} }).insufficientBalance).to.equal(
      'rewards_already_claimed'
    );
  });

  it('does not take an unrelated WaxAssertionError for an insufficient balance', () => {
    const error = new WaxAssertionError('[Chain Error] Missing Active Authority guest4test1');
    expect(transformError(error, { method: 'transfer', params: {} }).insufficientBalance).to.equal(null);
  });

  for (const [message, key] of [
    ['Assert Exception:false: Vote weight cannot be 0.', 'broadcast_error.vote_weight_zero'],
    [
      'Assert Exception: Your current vote on this comment is identical to this vote.',
      'broadcast_error.vote_identical'
    ],
    ['Assert Exception: Account does not have enough mana to downvote.', 'broadcast_error.not_enough_downvote_mana'],
    ['Assert Exception: You may only post once every 5 minutes.', 'broadcast_error.post_interval'],
    ['Assert Exception: You may only comment once every 3 seconds.', 'broadcast_error.comment_interval'],
    ['AuthorizationError: Not authorized', 'auth_error.authentication_failed'],
    ['AuthorizationError: Invalid WIF checksum', 'chainvalidation_js.invalid_wif_checksum'],
    ['AuthorizationError: Invalid WIF key', 'login_form.zod_error.invalid_wif'],
    ['Error: Key verification failed', 'auth_error.key_verification_failed'],
    ['Error: No key provided', 'auth_error.no_key_provided'],
    ['Error: Key does not have the required authority for this account', 'auth_error.missing_authority']
  ] as const) {
    it(`titles a well-known error with a smart-signer key every locale translates (${key})`, () => {
      const { errorTitle, errorTitleKey, isWellKnownError } = transformError(new Error(message));
      expect(errorTitleKey).to.equal(key);
      expect(message).to.contain(errorTitle);
      expect(isWellKnownError).to.equal(true);
      const english = translate('en', key);
      expect(english).to.be.a('string');
      for (const locale of readdirSync(SMART_SIGNER_LOCALES_DIR).filter(locale => locale !== 'en')) {
        expect(translate(locale, key), locale).to.be.a('string').and.not.equal(english);
      }
    });
  }

  it('titles an unknown error with the generic key, which every locale translates', () => {
    expect(transformError(peakVaultRejection({ error: 'sign_error' })).errorTitleKey).to.equal(GENERIC_ERROR_TITLE_KEY);
    for (const locale of readdirSync(SMART_SIGNER_LOCALES_DIR)) {
      expect(translate(locale, GENERIC_ERROR_TITLE_KEY), locale).to.be.a('string');
    }
    expect(translate('pl', GENERIC_ERROR_TITLE_KEY)).to.equal('Błąd');
  });

  it("titles a wallet's own answer with that answer, not a key", () => {
    const keychain = new WaxKeychainProviderError('Keychain error: The account is not in your wallet');
    expect(transformError(keychain).errorTitleKey).to.equal(undefined);
    const peakVault = peakVaultRejection({ error: 'sign_error', message: 'Could not sign the transaction' });
    expect(transformError(peakVault).errorTitleKey).to.equal(undefined);
  });

  it('keeps the generic title for an unknown error', () => {
    const { errorTitle, errorTitleKey, isWellKnownError, keychainFallback, insufficientBalance } = transformError(
      new Error('boom')
    );
    expect(errorTitle).to.equal('Error');
    expect(errorTitleKey).to.equal(GENERIC_ERROR_TITLE_KEY);
    expect(isWellKnownError).to.equal(false);
    expect(keychainFallback).to.equal(null);
    expect(insufficientBalance).to.equal(null);
  });
});

describe('summarizeErrorForLog', () => {
  it("keeps an Error's name and message but not its cause", () => {
    const error = new Error('Missing Posting Authority alice', {
      cause: { request: { trx: { signatures: ['1f00deadbeef'] } } }
    });
    error.name = 'WaxChainApiError';

    expect(summarizeErrorForLog(error)).to.equal('WaxChainApiError: Missing Posting Authority alice');
  });

  it("logs only a wallet response's message, not the request it answers", () => {
    const response = { success: false, message: 'Request was canceled by the user.', data: { operations: [['vote', {}]] } };

    expect(summarizeErrorForLog(response)).to.equal('Request was canceled by the user.');
  });

  it('logs no field of an unknown object', () => {
    expect(summarizeErrorForLog({ trx: { signatures: ['1f00deadbeef'] } })).to.equal('non-Error value');
  });

  it('redacts a WIF key in the message', () => {
    const wif = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';

    expect(summarizeErrorForLog(new Error(`Invalid key ${wif}`))).to.equal('Error: Invalid key [REDACTED]');
  });
});
