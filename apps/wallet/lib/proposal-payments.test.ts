import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Big from 'big.js';
import { QueryClient } from '@tanstack/react-query';
import {
  PROPOSAL_PAYMENTS_BATCH_SIZE,
  createProposalPaidLoader,
  paidByProposalId,
  proposalPaidQuery,
  proposalToPay,
  type FetchProposalPayments
} from './proposal-payments.ts';

/** A fetch answering every id with `id` HBD paid, recording the ids of each call. */
const recordingFetch = () => {
  const calls: number[][] = [];
  const fetchPayments: FetchProposalPayments = async (ids) => {
    calls.push(ids);
    return ids.map((id) => ({ proposal_id: id, total_paid: { amount: String(id * 1000), precision: 3 } }));
  };
  return { calls, fetchPayments };
};

const range = (count: number, from = 0) => Array.from({ length: count }, (_, index) => from + index);

const fetchPaid = (client: QueryClient, load: ReturnType<typeof createProposalPaidLoader>, ids: number[]) =>
  Promise.all(ids.map((id) => client.fetchQuery(proposalPaidQuery(id, load))));

describe('proposalToPay', () => {
  const dailyPay = new Big('100');

  it('is the lifetime maximum less what is paid for an active proposal', () => {
    assert.equal(proposalToPay('active', dailyPay, 30, new Big('1250.5'))?.toFixed(3), '1749.500');
  });

  it('is the whole lifetime maximum for an upcoming proposal not paid yet', () => {
    assert.equal(proposalToPay('inactive', dailyPay, 30, new Big(0))?.toFixed(3), '3000.000');
  });

  it('is undefined for an expired proposal', () => {
    assert.equal(proposalToPay('expired', dailyPay, 30, new Big('3000')), undefined);
  });

  it('is 0, not negative, when more than the maximum was paid', () => {
    assert.equal(proposalToPay('active', dailyPay, 30, new Big('3000.001'))?.toFixed(3), '0.000');
  });
});

describe('createProposalPaidLoader', () => {
  it('reads the paid HBD from the satoshi amount and precision', async () => {
    const load = createProposalPaidLoader(async () => [
      { proposal_id: 7, total_paid: { amount: '45689194336', precision: 3 } }
    ]);
    const { proposalId, paid } = await load(7);
    assert.equal(proposalId, 7);
    assert.equal(paid.toFixed(3), '45689194.336');
  });

  it('asks for the ids of one turn in one call, each id once', async () => {
    const { calls, fetchPayments } = recordingFetch();
    const load = createProposalPaidLoader(fetchPayments);

    const paid = await Promise.all([load(3), load(1), load(3)]);

    assert.deepEqual(calls, [[3, 1]]);
    assert.deepEqual(
      paid.map(({ proposalId }) => proposalId),
      [3, 1, 3]
    );
  });

  it('splits more than the batch size of ids into several calls', async () => {
    const { calls, fetchPayments } = recordingFetch();
    const load = createProposalPaidLoader(fetchPayments);
    const ids = range(2 * PROPOSAL_PAYMENTS_BATCH_SIZE + 500);

    const paid = await Promise.all(ids.map(load));

    assert.deepEqual(
      calls.map((call) => call.length),
      [PROPOSAL_PAYMENTS_BATCH_SIZE, PROPOSAL_PAYMENTS_BATCH_SIZE, 500]
    );
    assert.deepEqual(calls.flat(), ids);
    assert.equal(paid[2400].paid.toFixed(3), '2400.000');
  });

  it('rejects the loads of a failed call', async () => {
    const failure = new Error('404');
    const load = createProposalPaidLoader(async () => {
      throw failure;
    });
    await assert.rejects(Promise.all([load(1), load(2)]), failure);
  });

  it('rejects the load of an id the answer leaves out', async () => {
    const load = createProposalPaidLoader(async () => []);
    await assert.rejects(load(5), /left proposal #5 out/);
  });
});

describe('proposalPaidQuery', () => {
  it('asks only for the ids not cached yet when another page loads', async () => {
    const client = new QueryClient();
    const { calls, fetchPayments } = recordingFetch();
    const load = createProposalPaidLoader(fetchPayments);

    await fetchPaid(client, load, [11, 12, 13]);
    const secondPage = await fetchPaid(client, load, [13, 14, 15]);

    assert.deepEqual(calls, [
      [11, 12, 13],
      [14, 15]
    ]);
    assert.deepEqual(
      [...paidByProposalId(secondPage.map((data) => ({ data }))).entries()].map(([id, paid]) => [
        id,
        paid.toFixed(3)
      ]),
      [
        [13, '13.000'],
        [14, '14.000'],
        [15, '15.000']
      ]
    );
  });

  it('leaves a proposal whose payments failed out of the totals', async () => {
    const client = new QueryClient();
    const load = createProposalPaidLoader(async () => {
      throw new Error('404');
    });
    await assert.rejects(client.fetchQuery(proposalPaidQuery(1, load)));

    assert.equal(client.getQueryState(['proposalPaid', 1])?.status, 'error');
    assert.equal(paidByProposalId([{ data: undefined }]).size, 0);
  });
});
