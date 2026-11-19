import { z } from 'zod';
import { hiveAuthCredentialKey, readCredential } from '@smart-signer/lib/signer/credential-storage';

/**
 * What HiveAuth keeps for a signed-in account: the HAS session the wallet app approved. The `key` is
 * the `auth_key` requests to the wallet app are encrypted with, not a Hive key; no Hive key is kept.
 */
export interface HiveAuthSession {
  username: string;
  key: string;
  /** The session token of HAS protocols before 1.0; empty when the wallet app sent none */
  token: string;
  /** When the wallet app stops accepting this session's requests, in milliseconds since the epoch */
  expire: number;
}

/**
 * A session this close to its expiry is taken as expired: a request sent now would still be waiting
 * for the user when the wallet app drops the session (HAS requests wait 60 s by default).
 */
export const SESSION_EXPIRY_MARGIN_MS = 60_000;

/** Below this an expiry is in seconds since the epoch (older wallet apps), above it in milliseconds */
const EPOCH_MS_THRESHOLD = 1e12;

const sessionSchema = z.object({
  username: z.string().min(1),
  key: z.string().min(1),
  token: z.string().default(''),
  expire: z.number().positive()
});

/** `expire` as the wallet app sent it (seconds or milliseconds since the epoch) in milliseconds */
export function expiryInMs(expire: number): number {
  return expire < EPOCH_MS_THRESHOLD ? expire * 1000 : expire;
}

function parseSession(value: string): HiveAuthSession | null {
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(value));
    return parsed.success ? { ...parsed.data, expire: expiryInMs(parsed.data.expire) } : null;
  } catch {
    return null;
  }
}

/**
 * `username`'s HiveAuth session, or null when there is none, or it expires within
 * `SESSION_EXPIRY_MARGIN_MS` of `now`; an expired or unreadable one is removed. The entry all accounts
 * shared before sessions were per account is taken over when it is `username`'s.
 */
export function readHiveAuthSession(storage: Storage, username: string, now = Date.now()): HiveAuthSession | null {
  const credentialKey = hiveAuthCredentialKey(username);
  const stored = readCredential(storage, credentialKey, (legacy) => parseSession(legacy)?.username === username);
  if (stored === null) return null;
  const session = parseSession(stored);
  if (session?.username !== username || session.expire - SESSION_EXPIRY_MARGIN_MS <= now) {
    storage.removeItem(credentialKey.key);
    return null;
  }
  return session;
}

export function writeHiveAuthSession(storage: Storage, session: HiveAuthSession): void {
  storage.setItem(hiveAuthCredentialKey(session.username).key, JSON.stringify(session));
}

export function clearHiveAuthSession(storage: Storage, username: string): void {
  storage.removeItem(hiveAuthCredentialKey(username).key);
}
