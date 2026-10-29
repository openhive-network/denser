/**
 * The log hint for a safe storage session that is locked: names the key the operation needs,
 * and the session's login key when that is another key, since the login key unlocks the session.
 */
export function unlockHint(loginKeyType: string, requiredKeyType?: string): string {
  if (!requiredKeyType || requiredKeyType === loginKeyType) return `unlock key ${loginKeyType}`;
  return `the operation requires key ${requiredKeyType}; unlock login key ${loginKeyType} first`;
}
