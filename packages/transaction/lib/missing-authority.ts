import { describeError } from './describe-error';

export type AuthorityRole = 'owner' | 'active' | 'posting';

// hived names the role in the exception (`tx_missing_active_auth`) and in its message
// ("missing required active authority"); wax carries either inside its error message.
const MISSING_AUTHORITY_PATTERN =
  /tx_missing_(owner|active|posting)_auth|missing required (owner|active|posting) authority/i;

/**
 * Thrown before signing when the signer cannot sign with the key `role` an operation needs. Its
 * message reads like the node's rejection, so `findMissingAuthority` reports the same role.
 */
export class MissingAuthorityError extends Error {
  readonly role: AuthorityRole;

  constructor(role: AuthorityRole) {
    super(`missing required ${role} authority`);
    this.name = 'MissingAuthorityError';
    this.role = role;
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
