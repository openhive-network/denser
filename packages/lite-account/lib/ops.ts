import { CONTENT_ALG, l2Digest } from './digest';
import type { JcsObject, JcsValue } from './jcs';
import { signDigest } from './sign';

/** App names = the custom_json ids the HAF apps listen on. */
export const LITE_ACCOUNT_APP = 'lite_account';
export const LITE_POSTS_APP = 'lite_posts';
export const L2_VERSION = 1;

export type L2Operation = { method: string; args: JcsObject };

/** The fields the L2 signature covers (everything but `signatures`). */
export type L2SignedFields = {
  app: string;
  version: number;
  operations: L2Operation[];
  expiration: string;
  nonce?: string;
};

export type L2Transaction = L2SignedFields & { signatures: string[] };

export type KeyMember = { member: { type: 'secp256k1'; value: string }; weight: number };
export type Authority = { weight_threshold: number; key_auths: KeyMember[]; account_auths: JcsValue[] };

/** L2 expiration timestamp: ISO-8601 seconds precision, UTC, no zone suffix (Hive style). */
export function l2Expiration(minutesFromNow = 10, nowMs = Date.now()): string {
  return new Date(nowMs + minutesFromNow * 60_000).toISOString().slice(0, 19);
}

export function l2SignedFields(
  app: string,
  operations: L2Operation[],
  expiration: string,
  nonce?: string
): L2SignedFields {
  const fields: L2SignedFields = { app, version: L2_VERSION, operations, expiration };
  if (nonce !== undefined) fields.nonce = nonce;
  return fields;
}

/** Sign the fields with each WIF (one signature per key) over the chain-bound digest. */
export function signL2Transaction(fields: L2SignedFields, chainId: string, wifs: string[]): L2Transaction {
  const digest = l2Digest(fields, chainId);
  return { ...fields, signatures: wifs.map((wif) => signDigest(digest, wif)) };
}

/** An L2 transaction authorized solely by the broadcaster's L1 signature (no L2 signatures). */
export function unsignedL2Transaction(fields: L2SignedFields): L2Transaction {
  return { ...fields, signatures: [] };
}

export function singleKeyAuthority(publicKey: string): Authority {
  return {
    weight_threshold: 1,
    key_auths: [{ member: { type: 'secp256k1', value: publicKey }, weight: 1 }],
    account_auths: []
  };
}

/** `register_account` (lite_account app): a new lite account with owner + posting roles. */
export function registerAccountOp(name: string, owner: Authority, posting: Authority): L2Operation {
  return { method: 'register_account', args: { name, owner, posting } };
}

export type AttestPostParams = {
  /** The lite account name (bare, without the did:lite: prefix). */
  author: string;
  /** The gate (broadcaster) account that authored the comment on L1. */
  l1Author: string;
  permlink: string;
  /** Hex digest from contentHash(). */
  contentHash: string;
};

/** `attest_post` (lite_posts app): the lite account claims a bridged comment. */
export function attestPostOp(p: AttestPostParams): L2Operation {
  return {
    method: 'attest_post',
    args: {
      author: p.author,
      l1_author: p.l1Author,
      permlink: p.permlink,
      content_hash: p.contentHash,
      content_alg: CONTENT_ALG
    }
  };
}

export type LiteBridgeMarker = { attester: string; alg: string };

/** The disavowal marker the gate puts in the comment's json_metadata (M2 spec §2.1). */
export function liteBridgeMarker(attester: string): LiteBridgeMarker {
  return { attester, alg: CONTENT_ALG };
}
