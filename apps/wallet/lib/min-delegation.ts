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

// wax ends the message of a chain exception it does not type with the exception's JSON after this.
const RAW_EXCEPTION_MARKER = 'Original deserialization data: ';
// Wrappers between the broadcast and the dialog keep wax's error as a cause.
const MAX_CAUSE_DEPTH = 5;

function parseErrorDetails(message: string): unknown {
  const marker = message.lastIndexOf(RAW_EXCEPTION_MARKER);
  const json = marker === -1 ? message : message.slice(marker + RAW_EXCEPTION_MARKER.length);
  const start = json.indexOf('{');
  const end = json.lastIndexOf('}');
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(json.slice(start, end + 1));
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/**
 * The stack frames of the chain exception behind `error`: wax's assertion errors carry them parsed
 * (`raw`), other wax errors in their message; searched along the `cause` chain.
 */
function chainExceptionStack(error: unknown): unknown[] {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== undefined; depth++) {
    if (isRecord(current) && isRecord(current.raw) && Array.isArray(current.raw.stack)) return current.raw.stack;
    const details = parseErrorDetails(current instanceof Error ? current.message : String(current));
    if (isRecord(details) && Array.isArray(details.stack)) return details.stack;
    current = isRecord(current) ? current.cause : undefined;
  }
  return [];
}

/**
 * The minimum delegation, in VESTS satoshis, that the chain named when it rejected a
 * `delegate_vesting_shares` operation for delegating less; null for any other error.
 */
export function rejectedMinDelegationVests(error: unknown): bigint | null {
  for (const entry of chainExceptionStack(error)) {
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
