import {
  liteDid,
  type CommentContent,
  type LiteQueueEntry,
  type LiteQueueReason,
  type LiteQueued,
  type LiteRelayOk
} from '@hiveio/lite-account';
import type { LiteRelayLimits } from './lite-relay-info-query';

/** The library's default attestation lifetime, for a gateway that names no `max_expiration_minutes`. */
const DEFAULT_EXPIRATION_MINUTES = 10;
/** The longest a queued post may wait, for a gateway that names no `root_queue.max_wait_s`. */
const DEFAULT_MAX_WAIT_S = 3600;

const positive = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** How long a root post's attestation is signed for: the gateway's maximum, so it outlives a normal queue wait. */
export function rootPostExpirationMinutes(limits: LiteRelayLimits | undefined): number {
  return positive(limits?.max_expiration_minutes) ?? DEFAULT_EXPIRATION_MINUTES;
}

/** A queued post, as kept across reloads: the ticket and the exact signed content (to re-sign it for the reserved gate). */
export type PersistedLiteQueue = { queued: LiteQueued; comment: CommentContent };

/** How long a persisted queue entry is worth keeping: the longest wait plus the window to sign once ready. */
export function persistedQueueTtlMs(limits: LiteRelayLimits | undefined): number {
  const queue = limits?.root_queue;
  return ((positive(queue?.max_wait_s) ?? DEFAULT_MAX_WAIT_S) + (positive(queue?.sign_window_s) ?? 0)) * 1000;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isComment(value: unknown): value is CommentContent {
  return isObject(value) && value.parent_author === '' && typeof value.parent_permlink === 'string'
    && typeof value.title === 'string' && typeof value.body === 'string'
    && Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === 'string');
}

/** Whether a stored value is a queued root post this page can resume. */
export function isPersistedLiteQueue(value: unknown): value is PersistedLiteQueue {
  if (!isObject(value) || !isObject(value.queued) || !isComment(value.comment)) return false;
  const q = value.queued;
  return q.code === 'queued' && typeof q.queue_id === 'string' && q.queue_id !== ''
    && typeof q.due_at === 'string' && typeof q.retry_after_s === 'number';
}

/** What the queue panel shows. `done`, `expired`, `cancelled` and `failed` are final. */
export type LiteQueueView =
  | { status: 'queued'; dueAt: string; position?: number }
  | { status: 'ready'; dueAt: string; gateAccount: string; readyUntil: string }
  | { status: 'done'; result: LiteRelayOk }
  | { status: 'expired'; reason?: LiteQueueReason }
  | { status: 'cancelled' }
  | { status: 'failed'; code: string };

export type LiteQueueEvent =
  | { type: 'entry'; entry: LiteQueueEntry }
  | { type: 'posted'; result: LiteRelayOk }
  | { type: 'cancelled' }
  | { type: 'failed'; code: string; reason?: LiteQueueReason };

export function initialQueueView(queued: LiteQueued): LiteQueueView {
  const position = 'position' in queued ? positive(queued.position) : undefined;
  return { status: 'queued', dueAt: queued.due_at, position };
}

const isFinal = (view: LiteQueueView) =>
  view.status === 'done' || view.status === 'expired' || view.status === 'cancelled' || view.status === 'failed';

function fromEntry(entry: LiteQueueEntry): LiteQueueView {
  switch (entry.state) {
    case 'queued':
      return { status: 'queued', dueAt: entry.due_at, position: entry.position };
    case 'ready':
      return { status: 'ready', dueAt: entry.due_at, gateAccount: entry.gate_account, readyUntil: entry.ready_until };
    case 'done':
      return { status: 'done', result: { ok: true, trx_id: entry.trx_id, l1_author: entry.l1_author, permlink: entry.permlink } };
    case 'expired':
      return { status: 'expired', reason: entry.reason };
    case 'cancelled':
      return { status: 'cancelled' };
  }
}

/**
 * The queue panel's state machine: queued → ready → done, or expired / cancelled / failed from
 * either. A final state stays final (a late poll answer cannot reopen it). A `queue_expired`
 * failure is an expiry, and `queue_not_ready` for a cancelled entry is a cancellation.
 */
export function queueViewReducer(view: LiteQueueView, event: LiteQueueEvent): LiteQueueView {
  if (isFinal(view)) return view;
  switch (event.type) {
    case 'entry':
      return fromEntry(event.entry);
    case 'posted':
      return { status: 'done', result: event.result };
    case 'cancelled':
      return { status: 'cancelled' };
    case 'failed':
      if (event.code === 'queue_expired') return { status: 'expired', reason: event.reason };
      if (event.code === 'queue_not_ready' && event.reason === 'cancelled') return { status: 'cancelled' };
      return { status: 'failed', code: event.code };
  }
}

/** Whole seconds from `nowMs` until the ISO time `at`; 0 once it has passed or when `at` is not a time. */
export function secondsUntil(at: string, nowMs: number): number {
  const ms = Date.parse(at) - nowMs;
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0;
}

/** A wait as `m:ss`. */
export function formatWait(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The page of a root post the gateway posted: under the lite account's DID on a node that serves
 * lite posts natively, else under the gate account that is its L1 author.
 */
export function liteRootPostPath(p: { category: string; attester: string; native: boolean; result: LiteRelayOk }): string {
  const author = p.native ? liteDid(p.attester) : p.result.l1_author;
  return `/${p.category}/@${author}/${p.result.permlink}`;
}

const ERROR_KEYS: Record<string, string> = {
  quota_exceeded: 'quota_exceeded',
  pool_busy: 'pool_busy',
  rate_limited: 'rate_limited',
  captcha_required: 'captcha_required',
  captcha_failed: 'captcha_required',
  body_too_large: 'body_too_large',
  banned: 'banned',
  invalid_request: 'invalid_request',
  content_mismatch: 'invalid_request',
  bad_signature: 'invalid_request',
  permlink_taken: 'permlink_taken',
  broadcast_failed: 'broadcast_failed',
  relay_unavailable: 'relay_unavailable'
};

/** The gateway error code (and queue end reason) of a thrown LiteRelayError, or undefined for any other error. */
export function relayErrorCode(error: unknown): { code: string; reason?: LiteQueueReason } | undefined {
  if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string') return undefined;
  const reason = 'reason' in error && typeof error.reason === 'string' ? error.reason : undefined;
  const known = reason === 'sign_window_elapsed' || reason === 'wait_exceeded' || reason === 'cancelled';
  return { code: error.code, reason: known ? reason : undefined };
}

/**
 * The `lite_account.root_post.errors.*` key explaining a failed root post: one per gateway error
 * the user can act on, the queue expiry by its reason, `unknown` for anything else.
 */
export function rootPostErrorKey(code: string | undefined, reason?: LiteQueueReason): string {
  if (code === 'queue_expired') return reason === 'sign_window_elapsed' ? 'sign_window_elapsed' : 'wait_exceeded';
  return (code !== undefined ? ERROR_KEYS[code] : undefined) ?? 'unknown';
}
