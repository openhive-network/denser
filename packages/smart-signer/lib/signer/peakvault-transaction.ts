// Owned by SignerPeakvault, but kept out of signer-peakvault.ts so its test can load it: that
// file pulls in the app's path aliases, which node's test runner does not resolve.
import type { ISignatureTransaction, ITransaction } from '@hiveio/wax';

interface ILegacyTransactionJson {
  operations: [string, unknown][];
}

interface IApiTransactionJson {
  operations: { type: string; value: unknown }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `legacy` with each number that `api` (the same value in wax's protobuf JSON) writes as a string
 * replaced by that string. Protobuf JSON writes exactly the 64-bit integers as strings; parts whose
 * shapes differ between the two forms (assets, extensions) are left as they are.
 */
const adoptInt64Strings = (legacy: unknown, api: unknown): unknown => {
  if (typeof legacy === 'number' && typeof api === 'string') return api;
  if (Array.isArray(legacy) && Array.isArray(api))
    return legacy.map((item, index) => adoptInt64Strings(item, api[index]));
  if (isRecord(legacy) && isRecord(api))
    return Object.fromEntries(Object.entries(legacy).map(([key, item]) => [key, adoptInt64Strings(item, api[key])]));
  return legacy;
};

/**
 * The transaction's legacy JSON in the shape Peak Vault's `requestSignTx` validates: wax's legacy
 * JSON writes a 64-bit integer (`update_proposal_votes.proposal_ids`, `remove_proposal.proposal_ids`,
 * `update_proposal.proposal_id`) as a number when it is small, Peak Vault wants a string. The
 * signed digest is unaffected: it is computed from the operation, not from this JSON.
 */
export function toPeakVaultLegacyApi(transaction: Pick<ITransaction, 'toLegacyApi' | 'toApiJson'>): string {
  const legacy: ILegacyTransactionJson = JSON.parse(transaction.toLegacyApi());
  // Not `toApi()`: like the legacy JSON, it writes a small 64-bit integer as a number.
  const api: IApiTransactionJson = transaction.toApiJson();
  const operations = legacy.operations.map(
    ([name, value], index): [string, unknown] => [name, adoptInt64Strings(value, api.operations[index]?.value)]
  );
  return JSON.stringify({ ...legacy, operations });
}

/**
 * `transaction` as `PeakVaultProvider.signTransaction` should see it: the provider sends Peak Vault
 * `toLegacyApi()`, so that answers `toPeakVaultLegacyApi`; signatures land on `transaction` itself.
 */
export function forPeakVault(transaction: ITransaction): ISignatureTransaction {
  return {
    get sigDigest() {
      return transaction.sigDigest;
    },
    addSignature(signature) {
      transaction.addSignature(signature);
      return this;
    },
    toLegacyApi: () => toPeakVaultLegacyApi(transaction),
    toApi: () => transaction.toApi(),
    isSigned: () => transaction.isSigned(),
    performOperationEncryption: transaction.performOperationEncryption?.bind(transaction)
  };
}
