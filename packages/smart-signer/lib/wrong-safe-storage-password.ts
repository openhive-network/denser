import type { KeyAuthorityType } from '@hiveio/hb-auth';

const MAX_CAUSE_DEPTH = 5;
const HB_AUTH_INVALID_CREDENTIALS = 'Invalid credentials';

/**
 * Unlocking the safe storage key with the password the user entered failed: hb-auth refused the
 * password. Its message stays hb-auth's, the toast shows a translated one.
 */
export class WrongSafeStoragePasswordError extends Error {
  constructor(cause: unknown) {
    super(HB_AUTH_INVALID_CREDENTIALS, { cause });
    this.name = 'WrongSafeStoragePasswordError';
  }
}

/**
 * The safe storage password unlocked the `keyType` key, but the account's authority on chain no
 * longer accepts it: the key was changed, or the account authority it relied on was removed.
 */
export class SafeStorageKeyNotAuthorizedError extends Error {
  readonly keyType: KeyAuthorityType;

  constructor(keyType: KeyAuthorityType, cause: unknown) {
    super(`The ${keyType} key in safe storage no longer has the account's authority`, { cause });
    this.name = 'SafeStorageKeyNotAuthorizedError';
    this.keyType = keyType;
  }
}

/**
 * Why hb-auth's `authenticate` refused unlocking a stored key with `Invalid credentials`:
 * - `wrong-password`: its worker could not unlock the stored key with the password;
 * - `key-not-stored`: its worker holds no stored key for the account;
 * - `key-not-authorized`: the key unlocked and signed, but the account's authority on chain rejected it.
 */
export type UnlockRefusal = 'wrong-password' | 'key-not-stored' | 'key-not-authorized';

function findInCauses(error: unknown, matches: (error: Error) => boolean): Error | undefined {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    if (matches(current)) return current;
    current = current.cause;
  }
  return undefined;
}

function findHbAuthInvalidCredentials(error: unknown): Error | undefined {
  return findInCauses(
    error,
    (candidate) => candidate.name === 'AuthorizationError' && candidate.message === HB_AUTH_INVALID_CREDENTIALS
  );
}

/**
 * Why hb-auth refused, with its `AuthorizationError("Invalid credentials")` in `error` or one of its
 * causes, the `authenticate` of a stored key; undefined for any other error. hb-auth gives every
 * reason the same name and message. The worker's refusal crosses Comlink, which rebuilds it as a plain
 * `Error` carrying the name, while the authority check on the main thread rejects with an instance of
 * hb-auth's own class. The worker refuses a wrong password and a missing stored key alike, so
 * `isAccountStored` tells those apart, asked only then.
 */
export async function classifyUnlockRefusal(
  error: unknown,
  isAccountStored: () => Promise<boolean>
): Promise<UnlockRefusal | undefined> {
  const refusal = findHbAuthInvalidCredentials(error);
  if (!refusal) return undefined;
  if (Object.getPrototypeOf(refusal) !== Error.prototype) return 'key-not-authorized';
  return (await isAccountStored()) ? 'wrong-password' : 'key-not-stored';
}

/** The `WrongSafeStoragePasswordError` that `error` is or was caused by, else undefined */
export function findWrongSafeStoragePassword(error: unknown): WrongSafeStoragePasswordError | undefined {
  const found = findInCauses(error, (candidate) => candidate instanceof WrongSafeStoragePasswordError);
  return found instanceof WrongSafeStoragePasswordError ? found : undefined;
}

/** The `SafeStorageKeyNotAuthorizedError` that `error` is or was caused by, else undefined */
export function findSafeStorageKeyNotAuthorized(error: unknown): SafeStorageKeyNotAuthorizedError | undefined {
  const found = findInCauses(error, (candidate) => candidate instanceof SafeStorageKeyNotAuthorizedError);
  return found instanceof SafeStorageKeyNotAuthorizedError ? found : undefined;
}
