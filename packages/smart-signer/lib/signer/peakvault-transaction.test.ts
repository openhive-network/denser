import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHiveChain } from '@hiveio/wax';
import PeakVaultProvider from '@hiveio/wax-signers-peakvault';
import { forPeakVault, toPeakVaultLegacyApi } from './peakvault-transaction.ts';

const chain = await createHiveChain();
const SIGNATURE = '1f' + 'ab'.repeat(64);

const buildTransaction = async () => {
  const tx = await chain.createTransactionWithTaPoS('0129d3f8a1a5f2b3c8d1e7f9a3b5c7d9e1f3a5b7', '2026-11-17T12:00:00');
  tx.pushOperation({
    update_proposal_votes_operation: { voter: 'alice', proposal_ids: ['5', '12'], approve: true, extensions: [] }
  });
  tx.pushOperation({ remove_proposal_operation: { proposal_owner: 'alice', proposal_ids: ['7'], extensions: [] } });
  tx.pushOperation({
    limit_order_create_operation: {
      owner: 'alice',
      orderid: 123,
      amount_to_sell: chain.hiveCoins(1),
      min_to_receive: chain.hbdCoins(1),
      fill_or_kill: false,
      expiration: '2026-11-18T12:00:00'
    }
  });
  tx.pushOperation({
    transfer_from_savings_operation: { from: 'alice', to: 'bob', request_id: 9, amount: chain.hiveCoins(1), memo: '' }
  });
  return tx;
};

describe('toPeakVaultLegacyApi', () => {
  it('writes proposal ids as strings and leaves the rest of the legacy JSON as wax writes it', async () => {
    const tx = await buildTransaction();
    const legacy = JSON.parse(tx.toLegacyApi());
    const forVault = JSON.parse(toPeakVaultLegacyApi(tx));

    assert.deepEqual(forVault.operations[0], [
      'update_proposal_votes',
      { voter: 'alice', proposal_ids: ['5', '12'], approve: true, extensions: [] }
    ]);
    assert.deepEqual(forVault.operations[1], [
      'remove_proposal',
      { proposal_owner: 'alice', proposal_ids: ['7'], extensions: [] }
    ]);
    assert.deepEqual(forVault.operations.slice(2), legacy.operations.slice(2));
    assert.equal(forVault.operations[2][1].orderid, 123);
    assert.equal(forVault.operations[3][1].request_id, 9);
    assert.deepEqual({ ...forVault, operations: [] }, { ...legacy, operations: [] });
  });
});

describe('forPeakVault', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it("sends Peak Vault string proposal ids and puts its signature on the caller's transaction", async () => {
    const calls: unknown[][] = [];
    Object.defineProperty(globalThis, 'window', {
      value: {
        peakvault: {
          requestSignTx: async (...args: unknown[]) => {
            calls.push(args);
            return { success: true, result: { signatures: [SIGNATURE] } };
          }
        }
      },
      configurable: true
    });
    const tx = await buildTransaction();
    const expectedSentTx = JSON.parse(toPeakVaultLegacyApi(tx));

    await PeakVaultProvider.for('alice', 'active').signTransaction(forPeakVault(tx));

    assert.equal(calls.length, 1);
    const [account, sentTx, role] = calls[0];
    assert.equal(account, 'alice');
    assert.equal(role, 'active');
    assert.deepEqual(sentTx, expectedSentTx);
    assert.deepEqual(tx.transaction.signatures, [SIGNATURE]);
    assert.deepEqual(JSON.parse(tx.toLegacyApi()).operations[0][1].proposal_ids, [5, 12]);
  });
});
