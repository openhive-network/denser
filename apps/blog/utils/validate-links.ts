import { getChain } from '@hive/transaction/lib/chain';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('validate-links');

export function isPermlinkValid(permlink: string): boolean {
  if (typeof permlink !== 'string') return false;
  return /^[a-z0-9-]{1,255}$/.test(permlink);
}

/**
 * Regex fallback for Hive account name validation.
 * TODO: Verify against blockchain consensus code (see TODO/003-hive-username-validation.md)
 */
function isValidAccountNameFallback(name: string): boolean {
  if (typeof name !== 'string') return false;
  // Hive account rules: 3-16 chars, lowercase, numbers, single dots (not consecutive, not at edges)
  if (name.length < 3 || name.length > 16) return false;
  if (!/^[a-z]/.test(name)) return false; // must start with letter
  if (!/^[a-z0-9.-]+$/.test(name)) return false; // allowed chars
  if (/\.\./.test(name)) return false; // no consecutive dots
  if (/^\./.test(name) || /\.$/.test(name)) return false; // no dot at edges
  if (/^-/.test(name) || /-$/.test(name)) return false; // no dash at edges
  return true;
}

export async function isUsernameValid(accountName: string): Promise<boolean> {
  if (typeof accountName !== 'string') return false;

  try {
    const chain = await getChain();
    return chain.isValidAccountName(accountName);
  } catch (err) {
    // WASM can fail with memory errors under concurrent load
    // Fall back to regex validation
    logger.warn(err, 'WASM isValidAccountName failed, using regex fallback');
    return isValidAccountNameFallback(accountName);
  }
}
