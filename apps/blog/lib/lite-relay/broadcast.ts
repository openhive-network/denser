import { ReplyOperation, type IReplyData } from '@hiveio/wax';
import { bridgedCommentMetadata, signDigest } from '@hive/lite-account';
import { getChain } from '@transaction/lib/chain';
import type { LiteRelayConfig } from './config';
import type { LiteReplyRequestInput } from './schema';

/**
 * Broadcast one L1 transaction, signed by the gate's posting key:
 *   comment_operation (json_metadata[<posts app id>] = disavowal marker naming the attester)
 *   + custom_json <account app id> [register_account]   (first post only)
 *   + custom_json <posts app id>   [attest_post]
 * The app ids are this relay's namespace (cfg.apps); validateReply already checked the
 * L2 transactions carry exactly those ids.
 * Atomic on L1: the comment and its attestation land together or not at all.
 */
export async function broadcastBridgedReply(
  req: LiteReplyRequestInput,
  permlink: string,
  cfg: LiteRelayConfig
): Promise<{ transactionId: string }> {
  const chain = await getChain();
  const tx = await chain.createTransaction();
  const reply: IReplyData = {
    parentAuthor: req.comment.parent_author,
    parentPermlink: req.comment.parent_permlink,
    author: cfg.gateAccount,
    permlink,
    title: req.comment.title,
    body: req.comment.body,
    jsonMetadata: bridgedCommentMetadata(cfg.apps, req.attester, req.comment.tags)
  };
  tx.pushOperation(new ReplyOperation(reply));
  for (const l2 of [req.register_tx, req.attest_tx]) {
    if (!l2) continue;
    tx.pushOperation({
      custom_json_operation: {
        id: l2.app,
        json: JSON.stringify(l2),
        required_auths: [],
        required_posting_auths: [cfg.gateAccount]
      }
    });
  }
  tx.validate();
  tx.addSignature(signDigest(tx.sigDigest, cfg.gatePostingWif));
  await chain.api.network_broadcast_api.broadcast_transaction({ max_block_age: -1, trx: tx.toApiJson() });
  return { transactionId: tx.id };
}
