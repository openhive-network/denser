import {
  contentHash, isValidPermlink, l2Digest, LITE_ACCOUNT_APP, LITE_POSTS_APP, recoverPublicKey
} from '@hive/lite-account';
import type { LiteReplyErrorCode } from '@hive/lite-account';
import type { LiteRelayConfig } from './config';
import type { L2TransactionInput, LiteReplyRequestInput } from './schema';

export class RelayValidationError extends Error {
  constructor(
    public readonly code: LiteReplyErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RelayValidationError';
  }
}

export type ValidatedReply = {
  permlink: string;
  /** The lite posting key that signed the attestation. */
  signer: string;
};

function fail(code: LiteReplyErrorCode, message: string): never {
  throw new RelayValidationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkExpiration(tx: L2TransactionInput, maxMinutes: number, nowMs: number): void {
  const expMs = Date.parse(`${tx.expiration}Z`);
  if (Number.isNaN(expMs)) fail('invalid_request', 'unparseable expiration');
  if (expMs <= nowMs) fail('invalid_request', 'L2 transaction already expired');
  if (expMs - nowMs > maxMinutes * 60_000) fail('invalid_request', `expiration exceeds ${maxMinutes} minutes`);
}

function keyAuthValues(authority: unknown): string[] {
  if (!isRecord(authority) || !Array.isArray(authority.key_auths)) return [];
  return authority.key_auths.flatMap((k) => {
    if (!isRecord(k) || !isRecord(k.member) || typeof k.member.value !== 'string') return [];
    return [k.member.value];
  });
}

/** The attestation must be a single attest_post, for this attester/gate, over the exact content. */
function validateAttest(req: LiteReplyRequestInput, cfg: LiteRelayConfig, nowMs: number): ValidatedReply {
  const tx = req.attest_tx;
  if (tx.app !== LITE_POSTS_APP) fail('invalid_request', `attest_tx.app must be ${LITE_POSTS_APP}`);
  checkExpiration(tx, cfg.maxExpirationMinutes, nowMs);
  const [op] = tx.operations;
  if (tx.operations.length !== 1 || !op || op.method !== 'attest_post') fail('invalid_request', 'attest_tx must carry exactly one attest_post');
  const a = op.args;
  if (a.author !== req.attester) fail('invalid_request', 'attest_post.author must equal attester');
  if (a.l1_author !== cfg.gateAccount) fail('invalid_request', `attest_post.l1_author must be ${cfg.gateAccount}`);
  if (typeof a.permlink !== 'string' || !isValidPermlink(a.permlink)) fail('invalid_request', 'invalid permlink');
  if (a.content_alg !== 'lite-comment-v1') fail('invalid_request', 'unsupported content_alg');
  const expected = contentHash(req.comment, cfg.chainId);
  const given = typeof a.content_hash === 'string' ? a.content_hash.replace(/^sha256:/, '') : '';
  if (given !== expected) fail('content_mismatch', 'content_hash does not match the comment content');
  if (tx.signatures.length !== 1) fail('bad_signature', 'attest_tx needs exactly one signature');
  const { signatures: _signatures, ...signedFields } = tx;
  let signer: string;
  try {
    signer = recoverPublicKey(l2Digest(signedFields, cfg.chainId), tx.signatures[0] ?? '');
  } catch (error) {
    fail('bad_signature', error instanceof Error ? error.message : 'unrecoverable signature');
  }
  return { permlink: a.permlink, signer };
}

/** First post: an unsigned register_account for the same name, whose posting authority holds the signer. */
function validateRegister(req: LiteReplyRequestInput, cfg: LiteRelayConfig, signer: string, nowMs: number): void {
  const tx = req.register_tx;
  if (!tx) return;
  if (tx.app !== LITE_ACCOUNT_APP) fail('invalid_request', `register_tx.app must be ${LITE_ACCOUNT_APP}`);
  checkExpiration(tx, cfg.maxExpirationMinutes, nowMs);
  if (tx.signatures.length !== 0) fail('invalid_request', 'register_tx must not carry L2 signatures');
  const [op] = tx.operations;
  if (tx.operations.length !== 1 || !op || op.method !== 'register_account') fail('invalid_request', 'register_tx must carry exactly one register_account');
  if (op.args.name !== req.attester) fail('invalid_request', 'register_account.name must equal attester');
  if (!keyAuthValues(op.args.posting).includes(signer)) {
    fail('bad_signature', 'the attestation is not signed by a key in the registered posting authority');
  }
  if (keyAuthValues(op.args.owner).length === 0) fail('invalid_request', 'register_account.owner needs a key');
}

export function validateReply(req: LiteReplyRequestInput, cfg: LiteRelayConfig, nowMs = Date.now()): ValidatedReply {
  if (Buffer.byteLength(req.comment.body, 'utf8') > cfg.maxBodyBytes) fail('invalid_request', 'body too large');
  const attested = validateAttest(req, cfg, nowMs);
  validateRegister(req, cfg, attested.signer, nowMs);
  return attested;
}
