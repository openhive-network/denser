import { describe, it } from 'mocha';
import { expect } from 'chai';
import { isTransactionExpired } from './transaction-expired';

// The shape of the node's answer to a transaction signed after its expiration, as wax rethrows it.
const expiredAnswer = JSON.stringify({
  jsonrpc: '2.0',
  error: {
    code: -32003,
    message: 'transaction expiration exception: now < trx_exp: ',
    data: { name: 'transaction_expiration_exception', message: 'transaction expiration exception' }
  },
  id: 1
});

describe('isTransactionExpired', () => {
  it('recognizes the expiration assertion in a wax error carrying the node answer', () => {
    const error = new Error(expiredAnswer);
    error.name = 'WaxUnhandledAssertionError';
    expect(isTransactionExpired(error)).to.equal(true);
  });

  it('recognizes the exception name or its message alone', () => {
    expect(isTransactionExpired(new Error('transaction_expiration_exception'))).to.equal(true);
    expect(isTransactionExpired('Transaction expiration exception: now < trx.expiration')).to.equal(true);
  });

  it('recognizes the assertion in a non-Error value a signer rejects with', () => {
    expect(isTransactionExpired({ success: false, error: expiredAnswer })).to.equal(true);
  });

  it('does not take other rejections or a timeout for an expiration', () => {
    expect(isTransactionExpired(new Error('missing required active authority'))).to.equal(false);
    expect(isTransactionExpired(new Error('Request timed out: "POST https://api.hive.blog"'))).to.equal(false);
    expect(isTransactionExpired(undefined)).to.equal(false);
  });
});
