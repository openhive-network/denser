import { describe, it } from 'mocha';
import { expect } from 'chai';
import { findTransactionExpirationRejection } from './transaction-expired';

/** The node's answer to a transaction failing one of hived's expiration assertions, as wax rethrows it. */
function nodeAnswer(assertion: string, data: Record<string, unknown>): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32003,
      message: `transaction expiration exception: ${assertion}: `,
      data: {
        code: 4060000,
        name: 'transaction_expiration_exception',
        message: 'transaction expiration exception',
        stack: [{ format: `${assertion}: `, data }]
      }
    },
    id: 1
  });
}

// `now < full_transaction->get_runtime_expiration()`: signed after its expiration had passed
const expiredAnswer = nodeAnswer('now < full_transaction->get_runtime_expiration()', {
  now: '2026-11-03T17:00:00',
  'full_transaction->get_runtime_expiration()': '2026-11-03T16:59:30'
});

// `trx.expiration <= now + HIVE_MAX_TIME_UNTIL_EXPIRATION`: an expiration later than the node accepts
const tooFarAheadAnswer = nodeAnswer('trx.expiration <= now + HIVE_MAX_TIME_UNTIL_EXPIRATION', {
  'trx.expiration': '2026-11-03T19:00:00',
  now: '2026-11-03T17:00:00',
  max_til_exp: 3600
});

function waxError(message: string): Error {
  const error = new Error(message);
  error.name = 'WaxUnhandledAssertionError';
  return error;
}

describe('findTransactionExpirationRejection', () => {
  it('reads an already passed expiration as expired', () => {
    expect(findTransactionExpirationRejection(waxError(expiredAnswer))).to.equal('expired');
    expect(findTransactionExpirationRejection('Transaction expiration exception: now < trx.expiration')).to.equal(
      'expired'
    );
  });

  it('reads an expiration beyond the maximum as too far ahead', () => {
    expect(findTransactionExpirationRejection(waxError(tooFarAheadAnswer))).to.equal('too_far_ahead');
  });

  it('reads the signature-expiration limit of hardfork 28 as too far ahead', () => {
    const answer = nodeAnswer('trx.expiration <= now + HIVE_MAX_TIME_UNTIL_SIGNATURE_EXPIRATION', {
      'trx.expiration': '2026-11-05T17:00:00',
      now: '2026-11-03T17:00:00',
      max_til_exp: 86400
    });
    expect(findTransactionExpirationRejection(waxError(answer))).to.equal('too_far_ahead');
  });

  it('takes the exception name or its message alone for an expired transaction', () => {
    expect(findTransactionExpirationRejection(new Error('transaction_expiration_exception'))).to.equal('expired');
    expect(findTransactionExpirationRejection('transaction expiration exception: now < trx_exp: ')).to.equal(
      'expired'
    );
  });

  it('reads the assertion in a non-Error value a signer rejects with', () => {
    expect(findTransactionExpirationRejection({ success: false, error: expiredAnswer })).to.equal('expired');
    expect(findTransactionExpirationRejection({ success: false, error: tooFarAheadAnswer })).to.equal(
      'too_far_ahead'
    );
  });

  it('does not take other rejections or a timeout for an expiration', () => {
    expect(findTransactionExpirationRejection(new Error('missing required active authority'))).to.equal(null);
    expect(findTransactionExpirationRejection(new Error('Request timed out: "POST https://api.hive.blog"'))).to.equal(
      null
    );
    expect(findTransactionExpirationRejection(new Error('max_til_exp'))).to.equal(null);
    expect(findTransactionExpirationRejection(undefined)).to.equal(null);
  });
});
