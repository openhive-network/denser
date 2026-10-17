/** The account and key type of a safe storage key write another app's writes superseded */
export interface SupersededKeyWrite {
  username: string;
  keyType: string;
}

/**
 * The key write `error` reports superseded (SupersededKeyWriteError of @hive/common-hiveio-packages,
 * told by its name so the error toast loads no hb-auth code); null for any other error
 */
export function findSupersededKeyWrite(error: unknown): SupersededKeyWrite | null {
  if (!(error instanceof Error) || error.name !== 'SupersededKeyWriteError') return null;
  if (!('username' in error) || !('keyType' in error)) return null;
  const { username, keyType } = error;
  return typeof username === 'string' && typeof keyType === 'string' ? { username, keyType } : null;
}

/** The smart-signer translation key telling the user to add the key a superseded write lost again */
export const SUPERSEDED_KEY_WRITE_MESSAGE = 'broadcast_error.superseded_key_write';
