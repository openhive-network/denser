import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

type TBuilderCallback = (builder: { pushOperation: (operation: unknown) => void }) => void;

interface ITransactionServiceUnderTest {
  signerOptions: unknown;
  processHiveAppOperation: (cb: TBuilderCallback, transactionOptions?: unknown) => Promise<Record<string, unknown>>;
}

class TransactionNotConfirmedError extends Error {
  constructor(readonly transactionId: string) {
    super(`Transaction ${transactionId} was broadcast but not seen in a block in time`);
  }
}

const VOTE = { vote_operation: { voter: 'alice', author: 'bob', permlink: 'post', weight: 10000 } };

/** What the wallet of the stand-in broadcasting signer was asked to do, and what the node was asked */
interface Recorded {
  broadcasts: { transaction: unknown; requiredKeyType: unknown }[];
  polls: string[][];
}

/**
 * `index.ts` with stand-ins for wax, WorkerBee and the signers (none load under mocha): the signer
 * broadcasts in its wallet (HiveAuth) and answers `walletTransactionId`; `found` is what the node
 * says about that transaction. The chain stand-in has no API, so a broadcast by the page fails.
 */
function loadTransactionService(walletTransactionId: string, found: boolean) {
  const recorded: Recorded = { broadcasts: [], polls: [] };
  const operations: unknown[] = [];
  const txBuilder = {
    transaction: { operations },
    sigDigest: 'digest',
    pushOperation: (operation: unknown) => operations.push(operation),
    validate: () => undefined
  };
  const signer = {
    broadcastTransaction: async ({ transaction, requiredKeyType }: { transaction: unknown; requiredKeyType: unknown }) => {
      recorded.broadcasts.push({ transaction, requiredKeyType });
      return walletTransactionId;
    }
  };
  const stubs: Record<string, unknown> = {
    '@hiveio/wax': {},
    '@hiveio/workerbee': {},
    '@smart-signer/lib/signer/get-signer': { getSigner: () => signer },
    '@smart-signer/lib/signer/signer': {
      isBroadcastingSigner: (candidate: object) => 'broadcastTransaction' in candidate
    },
    '@smart-signer/lib/signer/signed-in-check': {},
    '@hive/ui/lib/logging': { getLogger: () => ({}) },
    './lib/utils': {},
    './lib/chain': { getChain: async () => ({ createTransaction: async () => txBuilder }) },
    './lib/publishing-app': {},
    './lib/post-category': {},
    './lib/signer-options': { subscribeToSignerOptions: () => undefined },
    './lib/signed-out': { requireSignedIn: () => undefined },
    './lib/hive-api': {},
    './lib/profile-metadata': {},
    './lib/comment-metadata': {},
    './lib/required-key-type': { resolveRequiredKeyType: () => 'posting' },
    './lib/operation-names': {},
    './lib/workerbee-session': { WorkerBeeSession: class {} },
    './lib/transaction-inclusion': {
      inclusionLookupVia: () => async () => false,
      pollInclusion: async (_lookup: unknown, transactionIds: string[]) => {
        recorded.polls.push(transactionIds);
        return found;
      },
      TransactionNotConfirmedError
    },
    './lib/follow-list-reset': {},
    './lib/transaction-expiration': { TRANSACTION_EXPIRATION: 60_000 },
    './lib/unconfirmed-broadcasts': { UnconfirmedBroadcasts: class { checkResend = async () => undefined; } },
    './lib/broadcast-settlement': {},
    './lib/validate-hive-account': {},
    './lib/validation': {}
  };
  const source = readFileSync(join(__dirname, '..', 'index.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  });
  const stubRequire = (id: string) => {
    if (!(id in stubs)) throw new Error(`index.ts imports ${id}, which this test does not stub`);
    return stubs[id];
  };
  const module = { exports: {} as { TransactionService: new () => ITransactionServiceUnderTest } };
  new Function('exports', 'require', 'module', outputText)(module.exports, stubRequire, module);
  const service = new module.exports.TransactionService();
  service.signerOptions = { username: 'alice', loginType: 'hiveauth', keyType: 'posting', storageType: 'localStorage' };
  return { service, recorded };
}

const vote: TBuilderCallback = (builder) => builder.pushOperation(VOTE);

describe('TransactionService with a signer whose wallet broadcasts (HiveAuth)', () => {
  it("has the wallet broadcast the operations with the key they need and reports the wallet's transaction", async () => {
    const { service, recorded } = loadTransactionService('wallet-tx', true);

    const result = await service.processHiveAppOperation(vote);

    expect(result).to.deep.equal({ transactionId: 'wallet-tx' });
    expect(recorded.broadcasts).to.deep.equal([{ transaction: { operations: [VOTE] }, requiredKeyType: 'posting' }]);
    expect(recorded.polls).to.deep.equal([]);
  });

  it("with observe, resolves once the node finds the wallet's transaction in a block", async () => {
    const { service, recorded } = loadTransactionService('wallet-tx', true);

    expect(await service.processHiveAppOperation(vote, { observe: true })).to.deep.equal({ transactionId: 'wallet-tx' });
    expect(recorded.polls).to.deep.equal([['wallet-tx']]);
  });

  it('with observe, rejects as not confirmed when the node does not find it in time', async () => {
    const { service } = loadTransactionService('wallet-tx', false);

    const error = await service.processHiveAppOperation(vote, { observe: true }).then(
      () => undefined,
      (failure: unknown) => failure
    );

    expect(error).to.be.instanceOf(TransactionNotConfirmedError);
    expect(error).to.have.property('transactionId', 'wallet-tx');
  });

  it('with confirmInBackground, reports through `included` whether the node found it', async () => {
    const { service } = loadTransactionService('wallet-tx', false);

    const result = await service.processHiveAppOperation(vote, { confirmInBackground: true });

    expect(result.transactionId).to.equal('wallet-tx');
    expect(await result.included).to.equal(false);
  });

  it('does not follow a transaction whose id the wallet did not name', async () => {
    const { service, recorded } = loadTransactionService('', true);

    expect(await service.processHiveAppOperation(vote, { observe: true })).to.deep.equal({ transactionId: '' });
    expect(recorded.polls).to.deep.equal([]);
  });
});
