import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { resolveRequiredKeyType } from './required-key-type';

/**
 * The authorities come from real wax transactions, so the test also pins which role wax reports
 * for each operation. `@hiveio/wax` is ESM-only and loaded through a native dynamic import (see
 * wax-equivalence.test.ts).
 */

type RequiredAuthorities = Parameters<typeof resolveRequiredKeyType>[1];
interface IWaxTransaction {
  pushOperation(operation: object): IWaxTransaction;
  requiredAuthorities: RequiredAuthorities;
}
interface IWaxFoundation {
  createTransactionWithTaPoS(taposBlockId: string, expirationTime?: string): IWaxTransaction;
}
interface IWaxModule {
  createWaxFoundation(): Promise<IWaxFoundation>;
}

const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

const TAPOS_BLOCK_ID = '04c1c7a566fc0da66aee465714acee7346b48ac2';

const comment = {
  comment_operation: {
    parent_author: '',
    parent_permlink: 'hive',
    author: 'alice',
    permlink: 'a-post',
    title: 'A post',
    body: 'Body',
    json_metadata: '{}'
  }
};
const vote = { vote_operation: { voter: 'alice', author: 'bob', permlink: 'a-post', weight: 10000 } };
const transfer = {
  transfer_operation: {
    from: 'alice',
    to: 'bob',
    amount: { amount: '1000', precision: 3, nai: '@@000000021' },
    memo: ''
  }
};
const changeRecoveryAccount = {
  change_recovery_account_operation: { account_to_recover: 'alice', new_recovery_account: 'bob', extensions: [] }
};

describe('resolveRequiredKeyType', function () {
  let wax: IWaxFoundation;

  before(async function () {
    this.timeout(30_000);
    wax = await ((await importEsm('@hiveio/wax')) as IWaxModule).createWaxFoundation();
  });

  const authoritiesOf = (...operations: object[]): RequiredAuthorities => {
    const tx = wax.createTransactionWithTaPoS(TAPOS_BLOCK_ID);
    for (const operation of operations) tx.pushOperation(operation);
    return tx.requiredAuthorities;
  };

  it('signs a posting-only transaction with the posting key', () => {
    expect(resolveRequiredKeyType({}, authoritiesOf(comment))).to.equal('posting');
    expect(resolveRequiredKeyType({}, authoritiesOf(comment, vote))).to.equal('posting');
  });

  it('signs a transfer with the active key', () => {
    expect(resolveRequiredKeyType({}, authoritiesOf(transfer))).to.equal('active');
  });

  it('signs with the active key when any operation needs it', () => {
    expect(resolveRequiredKeyType({}, authoritiesOf(vote, transfer))).to.equal('active');
  });

  it('leaves owner-authority transactions to the signer', () => {
    expect(resolveRequiredKeyType({}, authoritiesOf(changeRecoveryAccount))).to.equal(undefined);
  });

  it('keeps the key type the caller passed', () => {
    expect(resolveRequiredKeyType({ requiredKeyType: 'posting' }, authoritiesOf(transfer))).to.equal('posting');
    expect(resolveRequiredKeyType({ requiredKeyType: 'active' }, authoritiesOf(comment))).to.equal('active');
  });

  it('derives nothing for a single-sign transaction', () => {
    expect(resolveRequiredKeyType({ singleSignKeyType: 'owner' }, authoritiesOf(comment))).to.equal(undefined);
  });
});
