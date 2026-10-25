import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import type { FollowOperation } from '@hiveio/wax';
import { buildFollowListReset, type FollowListReset } from './follow-list-reset';

/**
 * Builds each reset on wax's real `FollowOperation` and reads back the custom_json wax would
 * broadcast. `@hiveio/wax` is ESM-only and loaded through a native dynamic import (see
 * wax-equivalence.test.ts).
 */

interface ICustomJson {
  custom_json_operation: { id: string; json: string; required_auths: string[]; required_posting_auths: string[] };
}
interface IWaxTransaction {
  pushOperation(operation: object): IWaxTransaction;
  transaction: { operations: ICustomJson[] };
}
interface IWaxModule {
  createWaxFoundation(): Promise<{ createTransactionWithTaPoS(taposBlockId: string): IWaxTransaction }>;
  FollowOperation: new () => FollowOperation & { authorize(account: string): object };
}

const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

const TAPOS_BLOCK_ID = '04c1c7a566fc0da66aee465714acee7346b48ac2';
const ACCOUNT = 'alice';

describe('buildFollowListReset', function () {
  let wax: IWaxModule;
  let createTransaction: () => IWaxTransaction;

  before(async function () {
    this.timeout(30_000);
    wax = (await importEsm('@hiveio/wax')) as IWaxModule;
    const foundation = await wax.createWaxFoundation();
    createTransaction = () => foundation.createTransactionWithTaPoS(TAPOS_BLOCK_ID);
  });

  const broadcastOf = (list: FollowListReset) => {
    const operation = new wax.FollowOperation();
    buildFollowListReset(list, operation, ACCOUNT);
    return createTransaction().pushOperation(operation.authorize(ACCOUNT)).transaction.operations;
  };

  const expectSingleReset = (list: FollowListReset, action: string) => {
    const operations = broadcastOf(list);
    expect(operations).to.have.length(1);
    const { id, json, required_posting_auths } = operations[0].custom_json_operation;
    expect(id).to.equal('follow');
    expect(required_posting_auths).to.deep.equal([ACCOUNT]);
    expect(JSON.parse(json)).to.deep.equal(['follow', { follower: ACCOUNT, following: 'all', what: [action] }]);
  };

  it('unfollows everyone with reset_following_list alone, leaving the mute list', () => {
    expectSingleReset('following', 'reset_following_list');
  });

  it('empties each other list with its own reset', () => {
    expectSingleReset('muted', 'reset_muted_list');
    expectSingleReset('blacklist', 'reset_blacklist');
    expectSingleReset('followBlacklist', 'reset_follow_blacklist');
    expectSingleReset('followMuted', 'reset_follow_muted_list');
  });
});
