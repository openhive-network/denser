import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  type BroadcastSettlement,
  EarlierBroadcastPendingError,
  UnconfirmedBroadcasts
} from './unconfirmed-broadcasts';
import type { InclusionLookup } from './transaction-inclusion';

/** The registry's interval between lookups of a broadcast it settles. */
const SETTLE_POLL_INTERVAL_MS = 20_000;
const START = Date.parse('2026-11-07T02:00:00Z');
const EXPIRATION = new Date(START + 10 * 60_000);
const TRANSFER = JSON.stringify([{ transfer_operation: { from: 'alice', to: 'bob', amount: '1.000 HIVE' } }]);
const OTHER_TRANSFER = JSON.stringify([
  { transfer_operation: { from: 'alice', to: 'carol', amount: '1.000 HIVE' } }
]);

/**
 * A registry on a clock the test moves, holding one unconfirmed transfer, with the lookup's calls and the
 * settlements recorded. Its waits never end unless `advance` is true: then each wait moves the clock on.
 */
function setUp(lookUp: InclusionLookup, { advance = false } = {}) {
  const clock = { now: START };
  const lookups: (readonly string[])[] = [];
  const lookupTimes: number[] = [];
  const settlements: { transactionId: string; settlement: BroadcastSettlement; failure?: unknown }[] = [];
  let settled: () => void = () => undefined;
  const allSettled = new Promise<void>((resolve) => (settled = resolve));
  const broadcasts = new UnconfirmedBroadcasts(
    (ids) => {
      lookups.push(ids);
      lookupTimes.push(clock.now);
      return lookUp(ids);
    },
    ({ transactionId }, settlement, failure) => {
      settlements.push({ transactionId, settlement, failure });
      settled();
    },
    {
      now: () => clock.now,
      wait: (ms) =>
        advance
          ? Promise.resolve().then(() => {
              clock.now += ms;
            })
          : new Promise(() => undefined)
    }
  );
  broadcasts.record({
    transactionId: 'legacy1',
    transactionIds: ['hf26', 'legacy1'],
    operations: TRANSFER,
    expiration: EXPIRATION
  });
  return { broadcasts, clock, lookups, lookupTimes, settlements, allSettled };
}

async function rejectionOf(check: Promise<void>): Promise<EarlierBroadcastPendingError> {
  try {
    await check;
  } catch (error) {
    if (error instanceof EarlierBroadcastPendingError) return error;
    throw error;
  }
  return expect.fail('the resend was not refused');
}

describe('UnconfirmedBroadcasts', () => {
  it('refuses a resend of the same operations while the earlier one may still apply', async () => {
    const { broadcasts, clock, lookups } = setUp(async () => false);
    clock.now = START + 5 * 60_000;
    const error = await rejectionOf(broadcasts.checkResend(TRANSFER));
    expect(error.state).to.equal('may_still_apply');
    expect(error.transactionId).to.equal('legacy1');
    expect(error.expiration).to.equal(EXPIRATION);
    expect(lookups).to.deep.equal([['hf26', 'legacy1']]);
    // Still refused on the next attempt
    expect((await rejectionOf(broadcasts.checkResend(TRANSFER))).state).to.equal('may_still_apply');
  });

  it('lets other operations through without asking the node', async () => {
    const { broadcasts, lookups } = setUp(async () => false);
    await broadcasts.checkResend(OTHER_TRANSFER);
    expect(lookups).to.deep.equal([]);
  });

  it('reports the earlier one applied once a block includes it, then lets the same operations through', async () => {
    const { broadcasts } = setUp(async () => true);
    const error = await rejectionOf(broadcasts.checkResend(TRANSFER));
    expect(error.state).to.equal('applied');
    await broadcasts.checkResend(TRANSFER);
  });

  it('lets the same operations through once the earlier one has expired', async () => {
    const { broadcasts, clock, lookups } = setUp(async () => false);
    clock.now = EXPIRATION.getTime() + 3_000;
    await broadcasts.checkResend(TRANSFER);
    expect(lookups).to.deep.equal([]);
  });

  it('still refuses in the block interval after the expiration, when a block of that second may arrive', async () => {
    const { broadcasts, clock } = setUp(async () => false);
    clock.now = EXPIRATION.getTime() + 1_000;
    expect((await rejectionOf(broadcasts.checkResend(TRANSFER))).state).to.equal('may_still_apply');
  });

  it('refuses when the node cannot tell, keeping its failure as the cause', async () => {
    const failure = new Error('Request timed out');
    const { broadcasts } = setUp(async () => Promise.reject(failure));
    const error = await rejectionOf(broadcasts.checkResend(TRANSFER));
    expect(error.state).to.equal('may_still_apply');
    expect(error.cause).to.equal(failure);
  });

  describe('settling', () => {
    const DEADLINE = EXPIRATION.getTime() + 3_000;

    it('reports it applied once a lookup finds it in a block, and stops looking it up', async () => {
      let answer = false;
      const { broadcasts, lookupTimes, settlements, allSettled } = setUp(
        async () => {
          if (lookupTimes.length === 3) answer = true;
          return answer;
        },
        { advance: true }
      );
      await allSettled;
      expect(settlements).to.deep.equal([{ transactionId: 'legacy1', settlement: 'applied', failure: undefined }]);
      expect(lookupTimes).to.deep.equal([1, 2, 3].map((n) => START + n * SETTLE_POLL_INTERVAL_MS));
      // Settled: the same operations are sent again
      await broadcasts.checkResend(TRANSFER);
    });

    it('reports it expired after a lookup past its expiration and a block interval finds no block with it', async () => {
      const { broadcasts, lookupTimes, settlements, allSettled } = setUp(async () => false, { advance: true });
      await allSettled;
      expect(settlements).to.deep.equal([{ transactionId: 'legacy1', settlement: 'expired', failure: undefined }]);
      // No lookup is made after the one at the deadline
      expect(lookupTimes.at(-1)).to.equal(DEADLINE);
      expect(lookupTimes.slice(0, -1).every((time) => time < DEADLINE)).to.equal(true);
      expect(lookupTimes).to.have.length(Math.ceil((DEADLINE - START) / SETTLE_POLL_INTERVAL_MS));
      await broadcasts.checkResend(TRANSFER);
    });

    it('keeps looking it up through failures, and reports the outcome unknown when the last one fails', async () => {
      const failure = new Error('Request timed out');
      const { lookupTimes, settlements, allSettled } = setUp(async () => Promise.reject(failure), {
        advance: true
      });
      await allSettled;
      expect(settlements).to.deep.equal([{ transactionId: 'legacy1', settlement: 'unknown', failure }]);
      expect(lookupTimes.at(-1)).to.equal(DEADLINE);
    });

    it('reports it applied when it lands after earlier lookups failed', async () => {
      const { lookupTimes, settlements, allSettled } = setUp(
        async () => {
          if (lookupTimes.length < 3) throw new Error('Request timed out');
          return true;
        },
        { advance: true }
      );
      await allSettled;
      expect(settlements).to.deep.equal([{ transactionId: 'legacy1', settlement: 'applied', failure: undefined }]);
      expect(lookupTimes).to.have.length(3);
    });

    it('stays silent once a resend check reported it applied while it waited', async () => {
      let releaseWait: () => void = () => undefined;
      let lookups = 0;
      const settlements: BroadcastSettlement[] = [];
      const broadcasts = new UnconfirmedBroadcasts(
        async () => {
          lookups += 1;
          return true;
        },
        (_broadcast, settlement) => settlements.push(settlement),
        { now: () => START, wait: () => new Promise((resolve) => (releaseWait = resolve)) }
      );
      broadcasts.record({
        transactionId: 'legacy1',
        transactionIds: ['hf26', 'legacy1'],
        operations: TRANSFER,
        expiration: EXPIRATION
      });
      expect((await rejectionOf(broadcasts.checkResend(TRANSFER))).state).to.equal('applied');
      releaseWait();
      await new Promise((resolve) => setImmediate(resolve));
      expect(lookups).to.equal(1);
      expect(settlements).to.deep.equal([]);
    });
  });
});
