import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HBD_STABILIZER_ACCOUNT,
  computeFundingRound,
  isReturnProposal,
  maxDailyBudget,
  type FundingCandidate
} from './dhf-funding.ts';

const RETURN_ACCOUNTS = ['steem.dao', 'hive.fund'];

/** A proposal paying `dailyPay` HBD satoshis a day, active unless `status` says otherwise. */
const proposal = (
  proposalId: number,
  totalVotes: string,
  dailyPay: number,
  fields: Partial<FundingCandidate> = {}
): FundingCandidate => ({
  proposal_id: proposalId,
  receiver: `receiver-${proposalId}`,
  status: 'active',
  total_votes: totalVotes,
  daily_pay: { amount: String(dailyPay) },
  ...fields
});

const returnProposal = (totalVotes: string) =>
  proposal(0, totalVotes, 240_000_000_000, { receiver: 'hive.fund' });

const fundedIds = (proposals: FundingCandidate[], budget: number) => [
  ...computeFundingRound(proposals, BigInt(budget), RETURN_ACCOUNTS).payouts.keys()
];

describe('maxDailyBudget', () => {
  it('is a hundredth of the DHF balance, rounded toward zero', () => {
    assert.equal(maxDailyBudget(BigInt('23223141076')), BigInt('232231410'));
    assert.equal(maxDailyBudget(BigInt(99)), BigInt(0));
  });
});

describe('computeFundingRound', () => {
  it('funds the proposals ranked above the return proposal and none below it', () => {
    const proposals = [
      proposal(5, '100', 1_000),
      returnProposal('90'),
      proposal(7, '80', 1_000),
      proposal(3, '200', 2_000)
    ];

    const round = computeFundingRound(proposals, BigInt(50_000), RETURN_ACCOUNTS);

    assert.deepEqual(
      [...round.payouts.entries()],
      [
        [3, BigInt(2_000)],
        [5, BigInt(1_000)],
        [0, BigInt(47_000)]
      ]
    );
    assert.equal(round.dailyFunded, BigInt(3_000));
  });

  it('pays the proposal that exhausts the budget what is left, and nothing after it', () => {
    const proposals = [proposal(1, '300', 3_000), proposal(2, '200', 3_000), proposal(3, '100', 3_000)];

    const round = computeFundingRound(proposals, BigInt(5_000), RETURN_ACCOUNTS);

    assert.deepEqual(
      [...round.payouts.entries()],
      [
        [1, BigInt(3_000)],
        [2, BigInt(2_000)]
      ]
    );
    assert.equal(round.dailyFunded, BigInt(5_000));
  });

  it('funds nothing after a budget used up exactly', () => {
    assert.deepEqual(fundedIds([proposal(1, '300', 3_000), proposal(2, '200', 1)], 3_000), [1]);
  });

  it('skips proposals that are not active, whatever their votes', () => {
    const proposals = [
      proposal(1, '900', 1_000, { status: 'inactive' }),
      proposal(2, '800', 1_000, { status: 'expired' }),
      proposal(3, '100', 1_000)
    ];

    assert.deepEqual(fundedIds(proposals, 1_500), [3]);
  });

  it('ends the round at a proposal without votes, as hived does', () => {
    assert.deepEqual(fundedIds([proposal(1, '10', 1_000), proposal(2, '0', 1_000)], 1_000_000), [1]);
  });

  it('ranks the older proposal first on equal votes', () => {
    assert.deepEqual(fundedIds([proposal(9, '100', 1_000), proposal(4, '100', 1_000)], 1_000), [4]);
  });

  it('compares votes beyond the precision of a JavaScript number', () => {
    const proposals = [proposal(1, '90071992547409930', 1_000), proposal(2, '90071992547409931', 1_000)];

    assert.deepEqual(fundedIds(proposals, 1_000), [2]);
  });

  it('funds nothing from an empty DHF', () => {
    assert.deepEqual(fundedIds([proposal(1, '100', 1_000)], 0), []);
  });

  it('counts the HBD stabilizer apart from the daily funded amount', () => {
    const proposals = [
      proposal(1, '300', 12_000, { receiver: HBD_STABILIZER_ACCOUNT }),
      proposal(2, '200', 1_250),
      returnProposal('100')
    ];

    const round = computeFundingRound(proposals, BigInt(100_000), RETURN_ACCOUNTS);

    assert.equal(round.dailyFunded, BigInt(1_250));
    assert.equal(round.stabilizerFunded, BigInt(12_000));
  });

  it('reports no stabilizer share when no stabilizer proposal is funded', () => {
    const proposals = [
      proposal(2, '200', 1_250),
      returnProposal('100'),
      proposal(1, '50', 12_000, { receiver: HBD_STABILIZER_ACCOUNT })
    ];

    const round = computeFundingRound(proposals, BigInt(100_000), RETURN_ACCOUNTS);

    assert.equal(round.dailyFunded, BigInt(1_250));
    assert.equal(round.stabilizerFunded, BigInt(0));
  });
});

describe('isReturnProposal', () => {
  it('is proposal #0 paying the DHF back', () => {
    assert.equal(isReturnProposal({ proposal_id: 0, receiver: 'hive.fund' }, RETURN_ACCOUNTS), true);
    assert.equal(isReturnProposal({ proposal_id: 0, receiver: 'someone' }, RETURN_ACCOUNTS), false);
    assert.equal(isReturnProposal({ proposal_id: 12, receiver: 'hive.fund' }, RETURN_ACCOUNTS), false);
  });
});
