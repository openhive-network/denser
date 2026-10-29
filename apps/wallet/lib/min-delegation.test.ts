import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHiveChain } from '@hiveio/wax';
import { minDelegationHiveSatoshis, rejectedMinDelegationVests } from './min-delegation.ts';

const vests = (amount: string) => ({ amount, nai: '@@000000037', precision: 6 });

/** A broadcast rejection as wax reports it: the chain's fc exception, as JSON, in the message. */
const chainAssertion = (format: string, data: Record<string, unknown>) => {
  const error = new Error(
    JSON.stringify({
      code: 10,
      name: 'assert_exception',
      message: 'Assert Exception',
      stack: [
        {
          context: { level: 'error', file: 'hive_evaluator_transfer.cpp', line: 811, method: 'do_apply' },
          format,
          data
        }
      ],
      extension: { assertion_expression: 'op_vesting_shares >= min_delegation && "Minimum not reached"' }
    })
  );
  error.name = 'WaxChainAssertionError';
  return error;
};

describe('minDelegationHiveSatoshis', () => {
  it('is a third of the account creation fee', () => {
    assert.equal(minDelegationHiveSatoshis({ amount: '3000' }), BigInt(1000));
  });

  it('rounds toward zero as the chain does', () => {
    assert.equal(minDelegationHiveSatoshis({ amount: '3001' }), BigInt(1000));
    assert.equal(minDelegationHiveSatoshis({ amount: '2' }), BigInt(0));
  });
});

describe('rejectedMinDelegationVests', () => {
  it('reads the minimum a new delegation below it was rejected with', () => {
    const error = chainAssertion('Account must delegate a minimum of ${v}', {
      subject: vests('1606968'),
      v: vests('1606968922')
    });
    assert.equal(rejectedMinDelegationVests(error), BigInt('1606968922'));
  });

  it('reads the minimum a reduced delegation below it was rejected with', () => {
    const error = chainAssertion('Delegation must be removed or leave minimum delegation amount of ${v}', {
      v: vests('1606968922')
    });
    assert.equal(rejectedMinDelegationVests(error), BigInt('1606968922'));
  });

  it('reads the minimum when the format starts with the asserted expression', () => {
    const error = chainAssertion('op_vesting_shares >= min_delegation: Account must delegate a minimum of ${v}', {
      v: vests('1606968922')
    });
    assert.equal(rejectedMinDelegationVests(error), BigInt('1606968922'));
  });

  it('is null for another chain assertion', () => {
    const error = chainAssertion('Account ${acc} does not have sufficient funds', { acc: 'alice' });
    assert.equal(rejectedMinDelegationVests(error), null);
  });

  it('is null for errors that carry no chain exception', () => {
    assert.equal(rejectedMinDelegationVests(new Error('Network request failed')), null);
    assert.equal(rejectedMinDelegationVests(new Error('Unexpected { token }')), null);
    assert.equal(rejectedMinDelegationVests(undefined), null);
  });

  describe('as wax reports a broadcast the chain rejected', () => {
    const originalFetch = globalThis.fetch;
    const minimum = vests('1833333334');

    /** The JSON-RPC error answer hived sends; `extension` names the asserted expression on newer nodes. */
    const rejection = (extension?: Record<string, string>) => ({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32003,
        message: 'Assert Exception:op_vesting_shares >= min_delegation: Account must delegate a minimum of ${v}',
        data: {
          code: 10,
          name: 'assert_exception',
          message: 'Assert Exception',
          stack: [
            {
              context: {
                level: 'error',
                file: 'hive_evaluator_transfer.cpp',
                line: 811,
                method: 'do_apply',
                hostname: '',
                thread_name: 'th_a',
                timestamp: '2026-10-13T08:29:00'
              },
              format: 'Account must delegate a minimum of ${v}',
              data: { subject: vests('5500000000'), v: minimum }
            }
          ],
          ...(extension ? { extension } : {})
        }
      }
    });

    const broadcastError = async (answer: unknown): Promise<unknown> => {
      globalThis.fetch = async () => new Response(JSON.stringify(answer), { status: 200 });
      try {
        const chain = await createHiveChain({ apiEndpoint: 'http://127.0.0.1:1' });
        return await chain.api.network_broadcast_api
          .broadcast_transaction({ trx: {} as never, max_block_age: -1 })
          .then(() => undefined, (error: unknown) => error);
      } finally {
        globalThis.fetch = originalFetch;
      }
    };

    it('reads the minimum from the assertion error wax types', async () => {
      const error = await broadcastError(
        rejection({ assertion_expression: 'op_vesting_shares >= min_delegation' })
      );
      assert.equal(rejectedMinDelegationVests(error), BigInt(minimum.amount));
    });

    it('reads the minimum from the message of an exception wax leaves untyped', async () => {
      const error = await broadcastError(rejection());
      assert.equal(rejectedMinDelegationVests(error), BigInt(minimum.amount));
    });

    it('reads the minimum through a wrapping error', async () => {
      const error = await broadcastError(rejection());
      assert.equal(rejectedMinDelegationVests(new Error('broadcast failed', { cause: error })), BigInt(minimum.amount));
    });
  });
});
