import { contentHash, type CommentContent } from './digest';
import { generateKeyPair } from './keys';
import {
  attestPostOp, l2Expiration, l2SignedFields, LITE_ACCOUNT_APP, LITE_POSTS_APP, registerAccountOp,
  signL2Transaction, singleKeyAuthority, unsignedL2Transaction
} from './ops';
import { mintReplyPermlink } from './permlink';
import type { LiteReplyRequest } from './relay';

/** A device-held lite identity: owner + posting keys (distinct, per spec §A.3) and its registration state. */
export type LiteIdentity = {
  name: string;
  ownerPublicKey: string;
  postingPublicKey: string;
  ownerWif: string;
  postingWif: string;
  /** True once a register_account for this name has been broadcast. */
  registered: boolean;
  createdAt: string;
};

export function createLiteIdentity(name: string, nowMs = Date.now()): LiteIdentity {
  const owner = generateKeyPair();
  const posting = generateKeyPair();
  return {
    name,
    ownerPublicKey: owner.publicKey,
    postingPublicKey: posting.publicKey,
    ownerWif: owner.wif,
    postingWif: posting.wif,
    registered: false,
    createdAt: new Date(nowMs).toISOString()
  };
}

export type BuildLiteReplyParams = {
  identity: LiteIdentity;
  /** The relay's gate account (attest_post.l1_author). */
  gateAccount: string;
  chainId: string;
  comment: CommentContent;
  expirationMinutes?: number;
  clientId?: string;
  nowMs?: number;
};

export type BuiltLiteReply = { request: LiteReplyRequest; permlink: string; contentHash: string };

/**
 * Everything the browser does for one reply: hash the exact content, mint the permlink,
 * sign attest_post with the posting key, and (first post only) attach the unsigned
 * register_account. The relay re-derives and checks all of it (relay-validate.ts).
 */
export function buildLiteReplyRequest(p: BuildLiteReplyParams): BuiltLiteReply {
  const hash = contentHash(p.comment, p.chainId);
  const permlink = mintReplyPermlink(p.comment.parent_author, p.comment.parent_permlink, hash);
  const expiration = l2Expiration(p.expirationMinutes ?? 10, p.nowMs);
  const attest = signL2Transaction(
    l2SignedFields(LITE_POSTS_APP, [attestPostOp({ author: p.identity.name, l1Author: p.gateAccount, permlink, contentHash: hash })], expiration),
    p.chainId,
    [p.identity.postingWif]
  );
  const request: LiteReplyRequest = { attester: p.identity.name, comment: p.comment, attest_tx: attest };
  if (p.clientId) request.client_id = p.clientId;
  if (!p.identity.registered) {
    request.register_tx = unsignedL2Transaction(
      l2SignedFields(LITE_ACCOUNT_APP,
        [registerAccountOp(p.identity.name, singleKeyAuthority(p.identity.ownerPublicKey), singleKeyAuthority(p.identity.postingPublicKey))],
        expiration)
    );
  }
  return { request, permlink, contentHash: hash };
}
