/** What a signer prompt says it signs: a smart-signer translation key and its interpolation values */
export interface OperationSummary {
  key: string;
  values: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The operations of a transaction in wax's protobuf form, e.g. `{ account_witness_vote_operation: {...} }` */
const summarizers: Record<string, (body: Record<string, unknown>) => OperationSummary | undefined> = {
  account_witness_vote_operation: ({ witness, approve }) =>
    typeof witness === 'string'
      ? { key: approve ? 'operation_summary.witness_vote' : 'operation_summary.witness_unvote', values: { witness } }
      : undefined,
  update_proposal_votes_operation: ({ proposal_ids: ids, approve }) =>
    Array.isArray(ids) && ids.length > 0
      ? {
          key: approve ? 'operation_summary.proposal_vote' : 'operation_summary.proposal_unvote',
          values: { proposals: ids.map((id) => `#${String(id)}`).join(', ') }
        }
      : undefined
};

/**
 * The summary a prompt guarding the signature of a transaction of `operations` shows, or undefined
 * when the transaction is not one operation of a kind with a summary.
 */
export function summarizeOperations(operations: readonly object[]): OperationSummary | undefined {
  if (operations.length !== 1) return undefined;
  for (const [name, body] of Object.entries(operations[0])) {
    const summarize = summarizers[name];
    if (summarize && isRecord(body)) return summarize(body);
  }
  return undefined;
}
