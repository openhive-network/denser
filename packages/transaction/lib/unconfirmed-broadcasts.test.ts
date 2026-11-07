import { describe, it } from 'mocha';
import { expect } from 'chai';
import { EarlierBroadcastPendingError, UnconfirmedBroadcasts } from './unconfirmed-broadcasts';
import type { InclusionLookup } from './transaction-inclusion';

const START = Date.parse('2026-11-07T02:00:00Z');
const EXPIRATION = new Date(START + 10 * 60_000);
const TRANSFER = JSON.stringify([{ transfer_operation: { from: 'alice', to: 'bob', amount: '1.000 HIVE' } }]);
const OTHER_TRANSFER = JSON.stringify([
  { transfer_operation: { from: 'alice', to: 'carol', amount: '1.000 HIVE' } }
]);

/** A registry on a clock the test moves, holding one unconfirmed transfer, with the lookup's calls recorded. */
function setUp(lookUp: InclusionLookup) {
  const clock = { now: START };
  const lookups: (readonly string[])[] = [];
  const broadcasts = new UnconfirmedBroadcasts(
    (ids) => {
      lookups.push(ids);
      return lookUp(ids);
    },
    () => clock.now
  );
  broadcasts.record({
    transactionId: 'legacy1',
    transactionIds: ['hf26', 'legacy1'],
    operations: TRANSFER,
    expiration: EXPIRATION
  });
  return { broadcasts, clock, lookups };
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
});
