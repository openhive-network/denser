import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Big from 'big.js';
import { QueryClient } from '@tanstack/react-query';
import {
  PROPOSAL_PAYMENTS_BATCH_SIZE,
  createProposalPaidLoader,
  paidByProposalId,
  proposalLastPaidWhileUnfunded,
  proposalPaidQuery,
  proposalUnfunded,
  proposalUpToLeft,
  type FetchProposalPayments,
  type ProposalTerms
} from './proposal-payments.ts';

/** A fetch answering every id with `id` HBD paid, recording the ids of each call. */
const recordingFetch = () => {
  const calls: number[][] = [];
  const fetchPayments: FetchProposalPayments = async (ids) => {
    calls.push(ids);
    return ids.map((id) => ({
      proposal_id: id,
      total_paid: { amount: String(id * 1000), precision: 3 },
      payment_count: id,
      last_payment_time: '2026-06-01T00:00:00'
    }));
  };
  return { calls, fetchPayments };
};

const range = (count: number, from = 0) => Array.from({ length: count }, (_, index) => from + index);

const fetchPaid = (client: QueryClient, load: ReturnType<typeof createProposalPaidLoader>, ids: number[]) =>
  Promise.all(ids.map((id) => client.fetchQuery(proposalPaidQuery(id, load))));

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** 30 days into a 100 HBD a day proposal running from 2026-01-01 to 2026-04-11 (100 days) */
const NOW = Date.parse('2026-01-31T00:00:00Z');

const terms = (status: string, fields: Partial<ProposalTerms> = {}): ProposalTerms => ({
  status,
  start_date: '2026-01-01T00:00:00',
  end_date: '2026-04-11T00:00:00',
  daily_pay: { amount: new Big('100') },
  ...fields
});

const unfundedOf = (proposalTerms: ProposalTerms, paid: string, paymentCount: number, now = NOW) => {
  const unfunded = proposalUnfunded(proposalTerms, { paid: new Big(paid), paymentCount }, now);
  return unfunded && { ...unfunded, amount: unfunded.amount.toFixed(3) };
};

describe('proposalUnfunded', () => {
  it('is the daily pay of the hours since the start less what is paid, and those hours not paid in days, for an active proposal', () => {
    // Funded 20 of its 30 days so far
    assert.deepEqual(unfundedOf(terms('active'), '2000', 20 * 24), {
      amount: '1000.000',
      days: 10,
      neverFunded: false
    });
  });

  it('counts only whole hours elapsed', () => {
    assert.deepEqual(unfundedOf(terms('active'), '0', 0, NOW + 59 * 60 * 1000), {
      amount: '3000.000',
      days: 30,
      neverFunded: true
    });
  });

  it('counts up to the end, not now, for an expired proposal', () => {
    assert.deepEqual(unfundedOf(terms('expired'), '9000', 90 * 24, NOW + 365 * DAY_MS), {
      amount: '1000.000',
      days: 10,
      neverFunded: false
    });
  });

  it('is the whole elapsed pay for a proposal never funded', () => {
    assert.deepEqual(unfundedOf(terms('active'), '0', 0), { amount: '3000.000', days: 30, neverFunded: true });
  });

  it('keeps the HBD short of a partly paid hour while counting no unpaid day for it', () => {
    // Paid every hour, the last one only half
    assert.deepEqual(unfundedOf(terms('active'), '2997.917', 30 * 24), {
      amount: '2.083',
      days: 0,
      neverFunded: false
    });
  });

  it('is never below 0', () => {
    assert.deepEqual(unfundedOf(terms('active'), '3500', 30 * 24), { amount: '0.000', days: 0, neverFunded: false });
  });

  it('is undefined for a proposal that has not started', () => {
    assert.equal(unfundedOf(terms('inactive', { start_date: '2026-03-01T00:00:00' }), '0', 0), undefined);
    assert.equal(unfundedOf(terms('active', { start_date: '2026-03-01T00:00:00' }), '0', 0), undefined);
  });
});

describe('proposalUpToLeft', () => {
  it('is the daily pay of the time left for an active proposal', () => {
    assert.equal(proposalUpToLeft(terms('active'), NOW)?.toFixed(3), '7000.000');
    assert.equal(proposalUpToLeft(terms('active'), NOW + 12 * HOUR_MS)?.toFixed(3), '6950.000');
  });

  it('is 0 past the end', () => {
    assert.equal(proposalUpToLeft(terms('active'), NOW + 365 * DAY_MS)?.toFixed(3), '0.000');
  });

  it('is undefined for a proposal not active', () => {
    assert.equal(proposalUpToLeft(terms('inactive'), NOW), undefined);
    assert.equal(proposalUpToLeft(terms('expired'), NOW), undefined);
  });
});

describe('proposalLastPaidWhileUnfunded', () => {
  it('is the last payment of an active proposal not paid for over two hours', () => {
    assert.equal(
      proposalLastPaidWhileUnfunded('active', '2026-01-30T21:00:00', NOW),
      Date.parse('2026-01-30T21:00:00Z')
    );
  });

  it('is undefined while the proposal is paid every hour', () => {
    assert.equal(proposalLastPaidWhileUnfunded('active', '2026-01-30T23:00:00', NOW), undefined);
  });

  it('is undefined for a proposal never paid or not active', () => {
    assert.equal(proposalLastPaidWhileUnfunded('active', null, NOW), undefined);
    assert.equal(proposalLastPaidWhileUnfunded('expired', '2025-01-30T21:00:00', NOW), undefined);
  });
});

describe('createProposalPaidLoader', () => {
  it('reads the paid HBD from the satoshi amount and precision', async () => {
    const load = createProposalPaidLoader(async () => [
      {
        proposal_id: 7,
        total_paid: { amount: '45689194336', precision: 3 },
        payment_count: 3532,
        last_payment_time: '2026-11-16T22:00:00'
      }
    ]);
    const { proposalId, paid, paymentCount, lastPaymentTime } = await load(7);
    assert.equal(proposalId, 7);
    assert.equal(paid.toFixed(3), '45689194.336');
    assert.equal(paymentCount, 3532);
    assert.equal(lastPaymentTime, '2026-11-16T22:00:00');
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
      [...paidByProposalId(secondPage.map((data) => ({ data }))).entries()].map(([id, { paid }]) => [
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
