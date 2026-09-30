import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { canonicalize } from './jcs';

/** Hive mainnet chain id (hex). Testnets/mirrornets use their own 64-hex id. */
export const MAINNET_CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';

/** Content-hash canonicalization scheme id (instant-comment spec §A.5). */
export const CONTENT_ALG = 'lite-comment-v1';

/** The comment fields an attestation commits to (must match the L1 comment byte-for-byte). */
export type CommentContent = {
  parent_author: string;
  parent_permlink: string;
  title: string;
  body: string;
  tags: string[];
};

export function chainIdBytes(chainId: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(chainId)) {
    throw new Error('chain id must be a 64-character hex string');
  }
  return hexToBytes(chainId);
}

/**
 * The L2 signing digest: hex of sha256( chain_id || JCS(value) ) — the same function
 * HAF's hive.l2_transaction_digest computes, used both for L2 transaction signatures
 * (over the signed fields, without `signatures`) and for content hashes.
 */
export function l2Digest(value: unknown, chainId: string): string {
  const bytes = concatBytes(chainIdBytes(chainId), utf8ToBytes(canonicalize(value)));
  return bytesToHex(sha256(bytes));
}

/** `content_hash` for `attest_post`: the digest of the exact comment content. */
export function contentHash(content: CommentContent, chainId: string): string {
  return l2Digest(
    {
      parent_author: content.parent_author,
      parent_permlink: content.parent_permlink,
      title: content.title,
      body: content.body,
      tags: content.tags
    },
    chainId
  );
}
