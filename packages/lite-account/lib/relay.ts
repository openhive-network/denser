import type { CommentContent } from './digest';
import type { L2Transaction } from './ops';

/**
 * Frontend → relay contract for posting a bridged reply (instant-comment spec Part B,
 * M2 spec §2.2). The relay (gate account) broadcasts ONE L1 transaction:
 *   comment_operation (json_metadata[<posts app id>] = { attester, alg })
 *   + custom_json <account app id> [register_account]   (first post only, unsigned L2)
 *   + custom_json <posts app id>   [attest_post]        (signed by the lite posting key)
 * where the app ids are the relay's on-chain namespace (release: lite_account / lite_posts).
 */
export type LiteReplyRequest = {
  /** The lite account name claiming the comment (= the marker's attester). */
  attester: string;
  /** Exact comment content; the relay posts it byte-for-byte and re-derives content_hash. */
  comment: CommentContent;
  /** Present on the first post only. */
  register_tx?: L2Transaction;
  attest_tx: L2Transaction;
  /** Opaque per-browser id, for rate limiting only. */
  client_id?: string;
};

export type LiteReplyErrorCode =
  | 'invalid_request'
  | 'content_mismatch'
  | 'bad_signature'
  | 'rate_limited'
  | 'permlink_taken'
  | 'broadcast_failed'
  | 'relay_unavailable';

export type LiteReplyResponse =
  | { ok: true; trx_id: string; l1_author: string; permlink: string }
  | { ok: false; code: LiteReplyErrorCode; message: string };

export class LiteRelayError extends Error {
  constructor(
    public readonly code: LiteReplyErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'LiteRelayError';
  }
}

function isReplyResponse(value: unknown): value is LiteReplyResponse {
  return typeof value === 'object' && value !== null && 'ok' in value;
}

/** POST the request to the relay; resolves with the on-chain location or throws LiteRelayError. */
export async function postLiteReply(endpoint: string, request: LiteReplyRequest): Promise<Extract<LiteReplyResponse, { ok: true }>> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request)
    });
  } catch (error) {
    throw new LiteRelayError('relay_unavailable', error instanceof Error ? error.message : 'relay unreachable');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!isReplyResponse(payload)) {
    throw new LiteRelayError('relay_unavailable', `unexpected relay response (HTTP ${response.status})`);
  }
  if (!payload.ok) throw new LiteRelayError(payload.code, payload.message);
  return payload;
}
