import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { readTransactionExpiration, TRANSACTION_EXPIRATION } from './transaction-expiration';

/**
 * Builds a transaction on wax's real foundation with `TRANSACTION_EXPIRATION` and reads back the
 * expiration it would sign. `@hiveio/wax` is ESM-only and loaded through a native dynamic import (see
 * wax-equivalence.test.ts).
 */

interface IWaxTransaction {
  pushOperation(operation: object): IWaxTransaction;
  transaction: { expiration: string };
}
interface IWaxModule {
  createWaxFoundation(): Promise<{
    createTransactionWithTaPoS(taposBlockId: string, expirationTime?: string): IWaxTransaction;
  }>;
}

const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<unknown>;

const TAPOS_BLOCK_ID = '04c1c7a566fc0da66aee465714acee7346b48ac2';
const MINUTE_MS = 60_000;
// hived's HIVE_MAX_TIME_UNTIL_EXPIRATION
const MAX_TIME_UNTIL_EXPIRATION_MS = 60 * MINUTE_MS;

describe('TRANSACTION_EXPIRATION', function () {
  let build: (expiration?: string) => IWaxTransaction;

  before(async function () {
    this.timeout(30_000);
    const wax = (await importEsm('@hiveio/wax')) as IWaxModule;
    const foundation = await wax.createWaxFoundation();
    build = (expiration) =>
      foundation.createTransactionWithTaPoS(TAPOS_BLOCK_ID, expiration).pushOperation({
        vote_operation: { voter: 'alice', author: 'bob', permlink: 'post', weight: 10000 }
      });
  });

  it('builds a transaction that expires 10 minutes after its reference time', () => {
    const before = Date.now();
    const expiration = readTransactionExpiration(build(TRANSACTION_EXPIRATION).transaction.expiration);
    const after = Date.now();
    if (!expiration) return expect.fail('no expiration');
    // hived's timestamps have whole seconds
    expect(expiration.getTime()).to.be.within(before + 10 * MINUTE_MS - 1_000, after + 10 * MINUTE_MS);
    expect(expiration.getTime() - after).to.be.below(MAX_TIME_UNTIL_EXPIRATION_MS);
  });

  it('is longer than wax default of about a minute', () => {
    const fallback = readTransactionExpiration(build().transaction.expiration);
    const chosen = readTransactionExpiration(build(TRANSACTION_EXPIRATION).transaction.expiration);
    if (!fallback || !chosen) return expect.fail('no expiration');
    expect(chosen.getTime() - fallback.getTime()).to.be.at.least(8 * MINUTE_MS);
  });
});

describe('readTransactionExpiration', () => {
  it("reads hived's zone-less timestamp as UTC", () => {
    expect(readTransactionExpiration('2026-11-07T02:06:13')?.toISOString()).to.equal(
      '2026-11-07T02:06:13.000Z'
    );
    expect(readTransactionExpiration('2026-11-07T02:06:13Z')?.toISOString()).to.equal(
      '2026-11-07T02:06:13.000Z'
    );
  });

  it('gives undefined for a missing or unreadable timestamp', () => {
    expect(readTransactionExpiration(undefined)).to.equal(undefined);
    expect(readTransactionExpiration('')).to.equal(undefined);
    expect(readTransactionExpiration('not a time')).to.equal(undefined);
  });
});
