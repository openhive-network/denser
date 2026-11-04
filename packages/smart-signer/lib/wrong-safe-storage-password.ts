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

function findInCauses(error: unknown, matches: (error: Error) => boolean): Error | undefined {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    if (matches(current)) return current;
    current = current.cause;
  }
  return undefined;
}

/**
 * True when `error`, or one of its causes, is hb-auth's `AuthorizationError("Invalid credentials")`,
 * told by its name since hb-auth's worker hands it over as a plain Error. Only an `authenticate` of a
 * stored key means a wrong password by it; at registration it means the key lacks the authority.
 */
export function isHbAuthInvalidCredentials(error: unknown): boolean {
  return (
    findInCauses(
      error,
      (candidate) =>
        candidate.name === 'AuthorizationError' && candidate.message === HB_AUTH_INVALID_CREDENTIALS
    ) !== undefined
  );
}

/** The `WrongSafeStoragePasswordError` that `error` is or was caused by, else undefined */
export function findWrongSafeStoragePassword(error: unknown): WrongSafeStoragePasswordError | undefined {
  const found = findInCauses(error, (candidate) => candidate instanceof WrongSafeStoragePasswordError);
  return found instanceof WrongSafeStoragePasswordError ? found : undefined;
}
