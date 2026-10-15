import { describe, it } from 'mocha';
import { expect } from 'chai';
import { findMissingAuthority, MissingAuthorityError } from './missing-authority';

// The shape of the node's answer to a transfer signed with a posting key, as wax rethrows it.
const missingActiveAuthAnswer = JSON.stringify({
  jsonrpc: '2.0',
  error: {
    code: -32003,
    message: 'missing required active authority:Missing Active Authority guest4test1',
    data: { code: 3010000, name: 'tx_missing_active_auth', message: 'missing required active authority' }
  },
  id: 1
});

describe('findMissingAuthority', () => {
  it('finds the active role in a wax error carrying the node answer', () => {
    const error = new Error(missingActiveAuthAnswer);
    error.name = 'WaxAssertionError';
    expect(findMissingAuthority(error)).to.equal('active');
  });

  it('finds the role from the exception name alone', () => {
    expect(findMissingAuthority(new Error('3010000 tx_missing_owner_auth'))).to.equal('owner');
    expect(findMissingAuthority('tx_missing_posting_auth')).to.equal('posting');
  });

  it('finds the role from the message alone, in any case', () => {
    expect(findMissingAuthority(new Error('Missing required Active authority: alice'))).to.equal('active');
  });

  it('finds the role of a refusal raised before signing', () => {
    expect(findMissingAuthority(new MissingAuthorityError('active'))).to.equal('active');
    expect(findMissingAuthority(new MissingAuthorityError('posting'))).to.equal('posting');
  });

  it('reads plain objects', () => {
    expect(findMissingAuthority({ error: { data: { name: 'tx_missing_active_auth' } } })).to.equal('active');
  });

  it('returns null for other errors', () => {
    expect(findMissingAuthority(new Error('Account does not have enough mana to downvote'))).to.equal(null);
    expect(findMissingAuthority(new Error('missing required other authority'))).to.equal(null);
    expect(findMissingAuthority(undefined)).to.equal(null);
  });

  it('returns null for an object it cannot serialize', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(findMissingAuthority(circular)).to.equal(null);
  });
});
