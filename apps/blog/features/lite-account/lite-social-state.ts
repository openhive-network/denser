import { LITE_DID_PREFIX, isLiteDid } from './lite-did.ts';
import type { LiteRelayInfo } from './lite-relay-info-query.ts';

// No runtime import of @hiveio/lite-account: the buttons that read this are on every feed page;
// the signing code (`lite-social.ts`) is loaded on the first click.

const HIVE_DID_PREFIX = 'did:hive:';

/** The profile fields a lite account sets with `set_profile`: the ones the Hive profile settings edit. */
export const LITE_PROFILE_FIELDS = ['name', 'about', 'location', 'website', 'profile_image', 'cover_image'] as const;
export type LiteProfileFields = Partial<Record<(typeof LITE_PROFILE_FIELDS)[number], string>>;

/** One lite social op, without its actor (the browser's lite identity signs and acts). */
export type LiteSocialAction =
  | { method: 'follow' | 'unfollow' | 'mute' | 'unmute'; target: string }
  | { method: 'reblog' | 'unreblog'; author: string; permlink: string }
  | { method: 'subscribe' | 'unsubscribe'; community: string }
  | { method: 'set_profile'; profile: LiteProfileFields }
  /** The notification read marker, a naive-UTC `YYYY-MM-DDTHH:MM:SS` not after the op's block time. */
  | { method: 'set_last_read'; date: string };

export type LiteSocialMethod = LiteSocialAction['method'];

/** The DID a social op names an account by: a lite DID as is, a Hive account as `did:hive:<name>`. */
export function socialTargetDid(account: string): string {
  return isLiteDid(account) || account.startsWith(HIVE_DID_PREFIX) ? account : `${HIVE_DID_PREFIX}${account}`;
}

/** The DID of the browser's lite identity `name`. */
export const liteActorDid = (name: string): string => `${LITE_DID_PREFIX}${name}`;

/**
 * Whether guests can send `method` of the node's social app `app`: the deployment runs a gateway
 * whose `/info.limits.l2.apps[app]` lists it. A gateway that names no L2 apps relays none.
 */
export function relaysLiteSocial(info: LiteRelayInfo | undefined, app: string | null | undefined, method: LiteSocialMethod): boolean {
  if (!app || !info?.enabled) return false;
  const methods = info.limits?.l2?.apps?.[app];
  return Array.isArray(methods) && methods.includes(method);
}

/** The gateway's error codes, by the `lite_account.social.errors.*` key that explains them. */
const ERROR_KEYS: Record<string, string> = {
  rate_limited: 'rate_limited',
  auth_failed: 'identity',
  wrong_signer: 'identity',
  mixed_actors: 'identity',
  app_not_relayed: 'not_relayed',
  method_not_relayed: 'not_relayed',
  too_large: 'too_large',
  pool_busy: 'busy',
  broadcast_failed: 'unavailable',
  relay_unavailable: 'unavailable'
};

/** The `lite_account.social.errors.*` key for a gateway error code; `unknown` for anything else. */
export function liteSocialErrorKey(code: string | undefined): string {
  return (code !== undefined ? ERROR_KEYS[code] : undefined) ?? 'unknown';
}

/** The gateway's error code and `retry_after_s` carried by a failed relay, if `error` is one. */
export function liteSocialFailure(error: unknown): { code: string; retryAfterS?: number } | undefined {
  if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string') return undefined;
  const retry = 'retryAfterS' in error && typeof error.retryAfterS === 'number' && error.retryAfterS > 0 ? error.retryAfterS : undefined;
  return { code: error.code, retryAfterS: retry };
}
