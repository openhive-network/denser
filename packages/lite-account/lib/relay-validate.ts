import { CONTENT_ALG, contentHash, l2Digest, type CommentContent } from './digest';
import { DEFAULT_LITE_APP_IDS, type LiteAppIds } from './ops';
import { isValidPermlink } from './permlink';
import type { LiteReplyErrorCode } from './relay';
import { recoverPublicKey } from './sign';

/**
 * The relay's semantic checks on a reply request (instant-comment spec §A/§B, M2 §2):
 * shape is assumed already schema-validated; this verifies that the attestation is a
 * single attest_post for this attester and gate over the EXACT comment content, that
 * it is signed by a key in the (registered or to-be-registered) posting authority, and
 * that expirations are sane. Pure and network-free, so it is unit-tested with the builder.
 */
export type RelayL2Transaction = {
  app: string;
  version: number;
  operations: { method: string; args: Record<string, unknown> }[];
  expiration: string;
  nonce?: string;
  signatures: string[];
};

export type RelayRequest = {
  attester: string;
  comment: CommentContent;
  register_tx?: RelayL2Transaction;
  attest_tx: RelayL2Transaction;
};

export type RelayValidationOptions = {
  gateAccount: string;
  chainId: string;
  /** This relay's on-chain namespace (defaults to the release ids). */
  apps?: LiteAppIds;
  maxExpirationMinutes: number;
  maxBodyBytes: number;
  nowMs?: number;
};

export type ValidatedReply = { permlink: string; signer: string };

export class LiteRelayValidationError extends Error {
  constructor(
    public readonly code: LiteReplyErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'LiteRelayValidationError';
  }
}

function fail(code: LiteReplyErrorCode, message: string): never {
  throw new LiteRelayValidationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkExpiration(tx: RelayL2Transaction, maxMinutes: number, nowMs: number): void {
  const expMs = Date.parse(`${tx.expiration}Z`);
  if (Number.isNaN(expMs)) fail('invalid_request', 'unparseable expiration');
  if (expMs <= nowMs) fail('invalid_request', 'L2 transaction already expired');
  if (expMs - nowMs > maxMinutes * 60_000) fail('invalid_request', `expiration exceeds ${maxMinutes} minutes`);
}

function keyAuthValues(authority: unknown): string[] {
  if (!isRecord(authority) || !Array.isArray(authority.key_auths)) return [];
  return authority.key_auths.flatMap((k) =>
    isRecord(k) && isRecord(k.member) && typeof k.member.value === 'string' ? [k.member.value] : []
  );
}

function validateAttest(req: RelayRequest, opts: RelayValidationOptions, nowMs: number): ValidatedReply {
  const tx = req.attest_tx;
  const posts = (opts.apps ?? DEFAULT_LITE_APP_IDS).posts;
  if (tx.app !== posts) fail('invalid_request', `attest_tx.app must be ${posts}`);
  checkExpiration(tx, opts.maxExpirationMinutes, nowMs);
  const [op] = tx.operations;
  if (tx.operations.length !== 1 || !op || op.method !== 'attest_post') {
    fail('invalid_request', 'attest_tx must carry exactly one attest_post');
  }
  const a = op.args;
  if (a.author !== req.attester) fail('invalid_request', 'attest_post.author must equal attester');
  if (a.l1_author !== opts.gateAccount) fail('invalid_request', `attest_post.l1_author must be ${opts.gateAccount}`);
  if (typeof a.permlink !== 'string' || !isValidPermlink(a.permlink)) fail('invalid_request', 'invalid permlink');
  if (a.content_alg !== CONTENT_ALG) fail('invalid_request', 'unsupported content_alg');
  const given = typeof a.content_hash === 'string' ? a.content_hash.replace(/^sha256:/, '') : '';
  if (given !== contentHash(req.comment, opts.chainId)) fail('content_mismatch', 'content_hash does not match the comment content');
  if (tx.signatures.length !== 1) fail('bad_signature', 'attest_tx needs exactly one signature');
  const { signatures, ...signedFields } = tx;
  try {
    return { permlink: a.permlink, signer: recoverPublicKey(l2Digest(signedFields, opts.chainId), signatures[0] ?? '') };
  } catch (error) {
    return fail('bad_signature', error instanceof Error ? error.message : 'unrecoverable signature');
  }
}

function validateRegister(req: RelayRequest, opts: RelayValidationOptions, signer: string, nowMs: number): void {
  const tx = req.register_tx;
  if (!tx) return;
  const account = (opts.apps ?? DEFAULT_LITE_APP_IDS).account;
  if (tx.app !== account) fail('invalid_request', `register_tx.app must be ${account}`);
  checkExpiration(tx, opts.maxExpirationMinutes, nowMs);
  if (tx.signatures.length !== 0) fail('invalid_request', 'register_tx must not carry L2 signatures');
  const [op] = tx.operations;
  if (tx.operations.length !== 1 || !op || op.method !== 'register_account') {
    fail('invalid_request', 'register_tx must carry exactly one register_account');
  }
  if (op.args.name !== req.attester) fail('invalid_request', 'register_account.name must equal attester');
  if (!keyAuthValues(op.args.posting).includes(signer)) {
    fail('bad_signature', 'the attestation is not signed by a key in the registered posting authority');
  }
  if (keyAuthValues(op.args.owner).length === 0) fail('invalid_request', 'register_account.owner needs a key');
}

export function validateLiteReply(req: RelayRequest, opts: RelayValidationOptions): ValidatedReply {
  const nowMs = opts.nowMs ?? Date.now();
  if (new TextEncoder().encode(req.comment.body).length > opts.maxBodyBytes) fail('invalid_request', 'body too large');
  const attested = validateAttest(req, opts, nowMs);
  validateRegister(req, opts, attested.signer, nowMs);
  return attested;
}
