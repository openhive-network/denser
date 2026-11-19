import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOperations } from './operation-summary.ts';

describe('summarizeOperations', () => {
  it('names the witness of a witness vote removal', () => {
    assert.deepEqual(
      summarizeOperations([{ account_witness_vote_operation: { account: 'alice', witness: 'bob', approve: false } }]),
      { key: 'operation_summary.witness_unvote', values: { witness: 'bob' } }
    );
  });

  it('names the witness of a witness vote', () => {
    assert.deepEqual(
      summarizeOperations([{ account_witness_vote_operation: { account: 'alice', witness: 'bob', approve: true } }]),
      { key: 'operation_summary.witness_vote', values: { witness: 'bob' } }
    );
  });

  it('numbers the proposals of a proposal vote and of its removal', () => {
    const vote = (approve: boolean) => [
      { update_proposal_votes_operation: { voter: 'alice', proposal_ids: ['5', '12'], approve, extensions: [] } }
    ];
    assert.deepEqual(summarizeOperations(vote(true)), {
      key: 'operation_summary.proposal_vote',
      values: { proposals: '#5, #12' }
    });
    assert.deepEqual(summarizeOperations(vote(false)), {
      key: 'operation_summary.proposal_unvote',
      values: { proposals: '#5, #12' }
    });
  });

  it('summarizes no operation of another kind, and no transaction of several operations', () => {
    assert.equal(summarizeOperations([{ transfer_operation: { from: 'alice', to: 'bob' } }]), undefined);
    const witnessVote = { account_witness_vote_operation: { account: 'alice', witness: 'bob', approve: true } };
    assert.equal(summarizeOperations([witnessVote, witnessVote]), undefined);
    assert.equal(summarizeOperations([]), undefined);
  });
});
