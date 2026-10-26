import {
  canonicalize,
  l2Expiration,
  l2SignedFields,
  signL2Transaction,
  type JcsObject,
  type L2Operation,
  type L2Transaction,
  type LiteIdentity
} from '@hiveio/lite-account';
import { liteActorDid, socialTargetDid, type LiteSocialAction } from './lite-social-state.ts';

// TODO: build and relay with the package's buildSocialOp / relayL2 once @hiveio/lite-account
// publishes them; this module uses the primitives the published release has.

/** How long a signed social op is good for: it is relayed at once, so the library's default. */
const EXPIRATION_MINUTES = 10;
/** lite_social's limit on a `set_profile` profile, in JCS bytes. */
const MAX_PROFILE_BYTES = 8192;

/** A refused or failed relay: the gateway's `code` (`rate_limited`, `auth_failed`, …). */
export class LiteSocialError extends Error {
  readonly code: string;
  /** Set for `rate_limited`: when the gateway takes the next op. */
  readonly retryAfterS?: number;

  constructor(code: string, message: string, retryAfterS?: number) {
    super(message);
    this.name = 'LiteSocialError';
    this.code = code;
    this.retryAfterS = retryAfterS;
  }
}

/** The gateway's answer to a relayed op: the L1 transaction that carries it. */
export type LiteSocialRelayed = { trx_id: string; gate?: string; app?: string };

const definedFields = (fields: Record<string, string | undefined>): JcsObject =>
  Object.fromEntries(Object.entries(fields).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])));

function actionArgs(action: LiteSocialAction): JcsObject {
  switch (action.method) {
    case 'follow':
    case 'unfollow':
    case 'mute':
    case 'unmute':
      return { target: socialTargetDid(action.target) };
    case 'reblog':
    case 'unreblog':
      return { author: action.author, permlink: action.permlink };
    case 'subscribe':
    case 'unsubscribe':
      return { community: action.community };
    case 'set_profile':
      return { profile: definedFields(action.profile) };
    case 'set_last_read':
      return { date: action.date };
  }
}

/** The L2 operation of `action` acted by the lite account `actorName` (`args.actor` is its DID). */
export function liteSocialOperation(actorName: string, action: LiteSocialAction): L2Operation {
  return { method: action.method, args: { actor: liteActorDid(actorName), ...actionArgs(action) } };
}

export type BuildLiteSocialParams = {
  /** The acting lite account and its posting key. */
  identity: Pick<LiteIdentity, 'name' | 'postingWif'>;
  /** The node's social app id (`lite.get_info.apps.social`), the transaction's `app`. */
  app: string;
  /** The gateway's chain id (`/info.chain_id`), bound into the signature. */
  chainId: string;
  action: LiteSocialAction;
  nowMs?: number;
};

/**
 * One L2 transaction carrying `action`, signed with the identity's posting key over
 * `l2Digest(signed fields, chainId)`. Throws `LiteSocialError('too_large')` for a profile over
 * lite_social's limit.
 */
export function buildLiteSocialTransaction({ identity, app, chainId, action, nowMs }: BuildLiteSocialParams): L2Transaction {
  if (action.method === 'set_profile' && new TextEncoder().encode(canonicalize(definedFields(action.profile))).length > MAX_PROFILE_BYTES) {
    throw new LiteSocialError('too_large', `profile over ${MAX_PROFILE_BYTES} bytes`);
  }
  const fields = l2SignedFields(app, [liteSocialOperation(identity.name, action)], l2Expiration(EXPIRATION_MINUTES, nowMs));
  return signL2Transaction(fields, chainId, [identity.postingWif]);
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * POSTs `{ tx }` to the gateway's `/l2` (through `endpoint`). Resolves with its answer (202 with the
 * L1 `trx_id`); throws `LiteSocialError` with the gateway's code, `relay_unavailable` when it
 * could not be asked or answered something else.
 */
export async function relayLiteSocial(endpoint: string, tx: L2Transaction): Promise<LiteSocialRelayed> {
  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tx }) });
  } catch (error) {
    throw new LiteSocialError('relay_unavailable', error instanceof Error ? error.message : 'gateway unreachable');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (response.ok && isObject(payload) && typeof payload.trx_id === 'string') {
    return {
      trx_id: payload.trx_id,
      gate: typeof payload.gate === 'string' ? payload.gate : undefined,
      app: typeof payload.app === 'string' ? payload.app : undefined
    };
  }
  if (isObject(payload) && typeof payload.code === 'string') {
    const message = typeof payload.message === 'string' ? payload.message : payload.code;
    const retry = typeof payload.retry_after_s === 'number' ? payload.retry_after_s : undefined;
    throw new LiteSocialError(payload.code, message, retry);
  }
  throw new LiteSocialError('relay_unavailable', `unexpected gateway answer (HTTP ${response.status})`);
}
