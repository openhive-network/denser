import { describe, it } from 'mocha';
import { expect } from 'chai';
import { findNotEnoughRc } from './not-enough-rc';
import { findMissingAuthority } from './missing-authority';

// The shape of the node's answer to a witness vote by an account short of RC, as wax rethrows it.
const notEnoughRcAnswer = JSON.stringify({
  code: 4100100,
  name: 'not_enough_rc_exception',
  message: 'payer has not enough RC mana for transaction',
  stack: [
    {
      context: { level: 'error', file: 'rc_utility.cpp', line: 160, method: 'use_account_rcs' },
      format: 'Account: ${account_name} has ${rc_current} RC, needs ${rc} RC. Please wait to transact or power up HIVE.',
      data: { account_name: 'guest4test', rc: 251884603, rc_current: 144457255 }
    }
  ]
});

function waxAssertionError(message: string): Error {
  const error = new Error(message);
  error.name = 'WaxAssertionError';
  return error;
}

describe('findNotEnoughRc', () => {
  it('reads the current and needed RC from a wax error carrying the node answer', () => {
    expect(findNotEnoughRc(waxAssertionError(notEnoughRcAnswer))).to.deep.equal({
      current: 144457255,
      needed: 251884603
    });
  });

  it('reads the amounts when the node answer is nested as an escaped string', () => {
    const nested = JSON.stringify({ jsonrpc: '2.0', error: { message: notEnoughRcAnswer } });
    expect(findNotEnoughRc(waxAssertionError(nested))).to.deep.equal({ current: 144457255, needed: 251884603 });
  });

  it('recognizes the rejection without amounts', () => {
    expect(findNotEnoughRc(new Error('payer has not enough RC mana for transaction'))).to.deep.equal({
      current: null,
      needed: null
    });
    expect(findNotEnoughRc({ error: { data: { name: 'not_enough_rc_exception' } } })).to.deep.equal({
      current: null,
      needed: null
    });
  });

  it('returns null for other errors', () => {
    expect(findNotEnoughRc(new Error('Account does not have enough mana to downvote'))).to.equal(null);
    expect(findNotEnoughRc(new Error('missing required active authority'))).to.equal(null);
    expect(findNotEnoughRc(undefined)).to.equal(null);
  });

  it('is not mistaken for a missing authority', () => {
    expect(findMissingAuthority(waxAssertionError(notEnoughRcAnswer))).to.equal(null);
  });
});
