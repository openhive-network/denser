export type AuthorityRole = 'owner' | 'active' | 'posting';

// hived names the role in the exception (`tx_missing_active_auth`) and in its message
// ("missing required active authority"); wax carries either inside its error message.
const MISSING_AUTHORITY_PATTERN =
  /tx_missing_(owner|active|posting)_auth|missing required (owner|active|posting) authority/i;

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/**
 * The authority a broadcast was rejected for lacking, or null when `error` is not such a rejection.
 */
export function findMissingAuthority(error: unknown): AuthorityRole | null {
  const match = MISSING_AUTHORITY_PATTERN.exec(describeError(error));
  if (!match) return null;
  const role = (match[1] ?? match[2]).toLowerCase();
  return role === 'owner' || role === 'active' || role === 'posting' ? role : null;
}
