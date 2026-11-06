import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

type TBuilderCallback = (builder: { pushOperation: (operation: unknown) => void }) => void;

interface ITransactionServiceUnderTest {
  processHiveAppOperation: (cb: TBuilderCallback, transactionOptions?: unknown) => Promise<unknown>;
  accountCreate: (...args: unknown[]) => Promise<unknown>;
}

const FEE = { amount: '3000', precision: 3, nai: '@@000000021' };

/**
 * `index.ts` imports wax, WorkerBee and the signers, none of which load under mocha, so it is
 * transpiled without them and given stand-ins for the imports it reaches at load and in
 * `accountCreate`. An import outside this list fails the load rather than resolving to nothing.
 */
const STUBS: Record<string, unknown> = {
  '@hiveio/wax': {},
  '@hiveio/workerbee': {},
  '@smart-signer/lib/signer/get-signer': {},
  '@smart-signer/lib/signer/signed-in-check': {},
  '@hive/ui/lib/logging': { getLogger: () => ({}) },
  './lib/utils': { getAsset: async (value: string, token: string) => ({ value, token }) },
  './lib/chain': {
    getChain: async () => ({
      api: { database_api: { get_witness_schedule: async () => ({ median_props: { account_creation_fee: FEE } }) } }
    })
  },
  './lib/publishing-app': {},
  './lib/post-category': {},
  './lib/signer-options': { subscribeToSignerOptions: () => undefined },
  './lib/signed-out': {},
  './lib/hive-api': {},
  './lib/profile-metadata': {},
  './lib/comment-metadata': {},
  './lib/required-key-type': {},
  './lib/operation-names': {},
  './lib/workerbee-session': { WorkerBeeSession: class {} },
  './lib/transaction-inclusion': { inclusionLookupVia: () => async () => false },
  './lib/follow-list-reset': {},
  './lib/validate-hive-account': {},
  './lib/validation': {}
};

function loadTransactionService(): ITransactionServiceUnderTest {
  const source = readFileSync(join(__dirname, '..', 'index.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  });
  const stubRequire = (id: string) => {
    if (!(id in STUBS)) throw new Error(`index.ts imports ${id}, which this test does not stub`);
    return STUBS[id];
  };
  const module = { exports: {} as { TransactionService: new () => ITransactionServiceUnderTest } };
  new Function('exports', 'require', 'module', outputText)(module.exports, stubRequire, module);
  return new module.exports.TransactionService();
}

describe('TransactionService.accountCreate', () => {
  it('broadcasts account_create with the caller options and returns the broadcast result', async () => {
    const service = loadTransactionService();
    const calls: { cb: TBuilderCallback; transactionOptions: unknown }[] = [];
    const broadcastResult = { transactionId: 'f00d' };
    service.processHiveAppOperation = async (cb, transactionOptions) => {
      calls.push({ cb, transactionOptions });
      return broadcastResult;
    };
    const authority = { weight_threshold: 1, key_auths: {}, account_auths: { creator: 1 } };
    const transactionOptions = { observe: true };

    const result = await service.accountCreate(
      'STM-memo',
      'hive-123456',
      'creator',
      '',
      authority,
      authority,
      authority,
      transactionOptions
    );

    expect(result).to.equal(broadcastResult);
    expect(calls).to.have.length(1);
    expect(calls[0].transactionOptions).to.equal(transactionOptions);
    const operations: unknown[] = [];
    calls[0].cb({ pushOperation: (operation) => operations.push(operation) });
    expect(operations).to.deep.equal([
      {
        account_create_operation: {
          fee: { value: '3', token: 'HIVE' },
          active: authority,
          owner: authority,
          posting: authority,
          creator: 'creator',
          memo_key: 'STM-memo',
          new_account_name: 'hive-123456',
          json_metadata: ''
        }
      }
    ]);
  });
});
