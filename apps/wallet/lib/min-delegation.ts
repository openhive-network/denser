// Since HF20 the chain requires a delegation of at least a third of the witnesses' median account
// creation fee, in HIVE converted to VESTS (delegate_vesting_shares_evaluator, hive_evaluator_transfer.cpp).
const MIN_DELEGATION_FEE_DIVISOR = BigInt(3);

// The chain's asserts on a delegation below the minimum; both name the minimum, in VESTS, as `v`.
// Older nodes prefix the format with the asserted expression.
const MIN_DELEGATION_ASSERT_FORMATS: readonly string[] = [
  'Account must delegate a minimum of ${v}',
  'Delegation must be removed or leave minimum delegation amount of ${v}'
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * HIVE satoshis the smallest delegation the chain accepts is worth, given the median
 * `account_creation_fee` (HIVE) of `database_api.get_witness_schedule`.
 */
export const minDelegationHiveSatoshis = (accountCreationFee: { amount: string }): bigint =>
  BigInt(accountCreationFee.amount) / MIN_DELEGATION_FEE_DIVISOR;

function parseErrorDetails(message: string): unknown {
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(message.slice(start, end + 1));
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/**
 * The minimum delegation, in VESTS satoshis, that the chain named when it rejected a
 * `delegate_vesting_shares` operation for delegating less; null for any other error.
 */
export function rejectedMinDelegationVests(error: unknown): bigint | null {
  const details = parseErrorDetails(error instanceof Error ? error.message : String(error));
  const stack = isRecord(details) && Array.isArray(details.stack) ? details.stack : [];
  for (const entry of stack) {
    if (!isRecord(entry) || typeof entry.format !== 'string') continue;
    const { format } = entry;
    if (!MIN_DELEGATION_ASSERT_FORMATS.some((minimumFormat) => format.endsWith(minimumFormat))) continue;
    const minimum = isRecord(entry.data) ? entry.data.v : undefined;
    if (isRecord(minimum) && typeof minimum.amount === 'string' && /^\d+$/.test(minimum.amount)) {
      return BigInt(minimum.amount);
    }
  }
  return null;
}
